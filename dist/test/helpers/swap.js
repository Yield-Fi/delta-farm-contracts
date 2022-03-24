"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapHelper = void 0;
const ethers_1 = require("ethers");
const typechain_1 = require("../../typechain");
const math_1 = require("./math");
class SwapHelper {
    constructor(_factoryAddress, _routerAddress, _fee, _feeDenom, _signer) {
        this.FOREVER = "2000000000";
        this.router = typechain_1.PancakeRouterV2__factory.connect(_routerAddress, _signer);
        this.factory = typechain_1.PancakeFactory__factory.connect(_factoryAddress, _signer);
        this.signer = _signer;
        this.fee = _fee;
        this.feeDenom = _feeDenom;
        this.reserves = [];
    }
    async addLiquidities(liquidities) {
        const wbnbAddress = await this.router.WETH();
        for (const liq of liquidities) {
            if (liq.token0.address === wbnbAddress)
                this.signer.sendTransaction({ to: wbnbAddress, value: liq.amount0desired });
            if (liq.token1.address === wbnbAddress)
                this.signer.sendTransaction({ to: wbnbAddress, value: liq.amount1desired });
            await liq.token0.approve(this.router.address, liq.amount0desired);
            await liq.token1.approve(this.router.address, liq.amount1desired);
            await this.router.addLiquidity(liq.token0.address, liq.token1.address, liq.amount0desired, liq.amount1desired, 0, 0, await this.signer.getAddress(), this.FOREVER);
        }
    }
    async loadReserves(path) {
        const reserves = [];
        for (let i = 1; i < path.length; i++) {
            const currLp = typechain_1.PancakePair__factory.connect(await this.factory.getPair(path[i - 1], path[i]), this.signer);
            const [r0, r1] = await currLp.getReserves();
            const foundReserveIdx = this.reserves.findIndex((r) => r.lp === currLp.address);
            if (foundReserveIdx !== -1) {
                this.reserves[foundReserveIdx].totalSupply = await currLp.totalSupply();
                this.reserves[foundReserveIdx].r0 = r0;
                this.reserves[foundReserveIdx].r1 = r1;
            }
            else {
                this.reserves.push({
                    lp: currLp.address,
                    totalSupply: await currLp.totalSupply(),
                    t0: await currLp.token0(),
                    t1: await currLp.token1(),
                    r0,
                    r1,
                });
            }
        }
        return reserves;
    }
    getMktSell(aIn, rIn, rOut) {
        const aInWithFee = aIn.mul(this.fee);
        const numerator = aInWithFee.mul(rOut);
        const denominator = rIn.mul(this.feeDenom).add(aInWithFee);
        return numerator.div(denominator);
    }
    async computeLpHealth(liquidity, tokenA, tokenB) {
        const [tokenAamount, tokenBamount, rA, rB] = await this.computeUnderlaying(liquidity, tokenA, tokenB);
        return tokenAamount.add(this.getMktSell(tokenBamount, rB.sub(tokenBamount), rA.sub(tokenAamount)));
    }
    async computeSwapExactTokensForTokens(amtIn, path, updateReserve) {
        const amts = [amtIn];
        for (let i = 1; i < path.length; i++) {
            const currLp = typechain_1.PancakePair__factory.connect(await this.factory.getPair(path[i - 1], path[i]), this.signer);
            const reserveIdx = this.reserves.findIndex((r) => r.lp === currLp.address);
            if (reserveIdx === -1) {
                throw new Error("computeSwapExactTokensForTokens: not found reserve");
            }
            const isReverse = (await currLp.token0()) != path[i];
            const [rOut, rIn] = isReverse
                ? [this.reserves[reserveIdx].r1, this.reserves[reserveIdx].r0]
                : [this.reserves[reserveIdx].r0, this.reserves[reserveIdx].r1];
            amts.push(this.getMktSell(amts[i - 1], rIn, rOut));
            if (updateReserve) {
                if (isReverse) {
                    this.reserves[reserveIdx].r1 = this.reserves[reserveIdx].r1.sub(amts[i]);
                    this.reserves[reserveIdx].r0 = this.reserves[reserveIdx].r0.add(amts[i - 1]);
                }
                else {
                    this.reserves[reserveIdx].r0 = this.reserves[reserveIdx].r0.sub(amts[i]);
                    this.reserves[reserveIdx].r1 = this.reserves[reserveIdx].r1.add(amts[i - 1]);
                }
            }
        }
        return amts;
    }
    async computeOneSidedOptimalSwap(amt, path) {
        const currLp = typechain_1.PancakePair__factory.connect(await this.factory.getPair(path[path.length - 1], path[0]), this.signer);
        const reserveIdx = this.reserves.findIndex((r) => r.lp === currLp.address);
        if (reserveIdx === -1) {
            throw new Error("computeOneSidedOptimalSwap: not found reserve");
        }
        const con1 = ethers_1.BigNumber.from(2).mul(this.feeDenom).sub(this.feeDenom.sub(this.fee));
        const con2 = ethers_1.BigNumber.from(4).mul(this.fee).mul(this.feeDenom);
        const con3 = this.feeDenom.add(this.fee).pow(2);
        const con4 = this.fee.mul(2);
        const rIn = (await currLp.token0()) == path[0]
            ? this.reserves[reserveIdx].r0
            : this.reserves[reserveIdx].r1;
        const swapAmt = (0, math_1.sqrt)(rIn.mul(amt.mul(con2).add(rIn.mul(con3))))
            .sub(rIn.mul(con1))
            .div(con4);
        return swapAmt;
    }
    async computeTwoSidesOptimalSwap(amt0, amt1, path) {
        const currLp = typechain_1.PancakePair__factory.connect(await this.factory.getPair(path[path.length - 1], path[0]), this.signer);
        const reserveIdx = this.reserves.findIndex((r) => r.lp === currLp.address);
        if (reserveIdx === -1) {
            throw new Error("computeTwoSidesOptimalSwap: not found reserve");
        }
        const [r0, r1] = (await currLp.token0()) === path[0]
            ? [this.reserves[reserveIdx].r0, this.reserves[reserveIdx].r1]
            : [this.reserves[reserveIdx].r1, this.reserves[reserveIdx].r0];
        let amtA = amt0;
        let amtB = amt1;
        let rA = r0;
        let rB = r1;
        let isReversed = false;
        if (amt0.mul(r1) < amt1.mul(r0)) {
            amtA = amt1;
            amtB = amt0;
            rA = r1;
            rB = r0;
            isReversed = true;
        }
        const a = this.fee;
        const b = this.feeDenom.add(this.fee).mul(rA);
        const _c = amtA.mul(rB).sub(amtB.mul(rA));
        const c = _c.mul(this.feeDenom).div(amtB.add(rB)).mul(rA);
        const d = a.mul(c).mul(4);
        const e = (0, math_1.sqrt)(b.mul(b).add(d));
        const numerator = e.sub(b);
        const denominator = a.mul(2);
        return [numerator.div(denominator), isReversed];
    }
    async computeRemoveLiquidiy(tokenA, tokenB, liquidity) {
        const currLp = typechain_1.PancakePair__factory.connect(await this.factory.getPair(tokenA, tokenB), this.signer);
        const reserveIdx = this.reserves.findIndex((r) => r.lp === currLp.address);
        if (reserveIdx === -1) {
            throw new Error("removeLiquidity: not found reserve");
        }
        const isReversed = (await currLp.token0()) !== tokenA;
        const [reserveA, reserveB] = !isReversed
            ? [this.reserves[reserveIdx].r0, this.reserves[reserveIdx].r1]
            : [this.reserves[reserveIdx].r1, this.reserves[reserveIdx].r0];
        const amountA = liquidity.mul(reserveA).div(this.reserves[reserveIdx].totalSupply);
        const amountB = liquidity.mul(reserveB).div(this.reserves[reserveIdx].totalSupply);
        this.reserves[reserveIdx].r0 = this.reserves[reserveIdx].r0.sub(!isReversed ? amountA : amountB);
        this.reserves[reserveIdx].r1 = this.reserves[reserveIdx].r1.sub(!isReversed ? amountB : amountA);
        this.reserves[reserveIdx].totalSupply = this.reserves[reserveIdx].totalSupply.sub(liquidity);
        return [amountA, amountB];
    }
    async computeAddLiquidity(tokenA, tokenB, amountA, amountB) {
        const currLp = typechain_1.PancakePair__factory.connect(await this.factory.getPair(tokenA, tokenB), this.signer);
        const reserveIdx = this.reserves.findIndex((r) => r.lp === currLp.address);
        if (reserveIdx === -1) {
            throw new Error("computeAddLiquidity: not found reserve");
        }
        const isReversed = (await currLp.token0()) !== tokenA;
        const [reserveA, reserveB] = !isReversed
            ? [this.reserves[reserveIdx].r0, this.reserves[reserveIdx].r1]
            : [this.reserves[reserveIdx].r1, this.reserves[reserveIdx].r0];
        let [debrisA, debrisB] = [ethers_1.BigNumber.from(0), ethers_1.BigNumber.from(0)];
        const amountBOptimal = this.quote(amountA, reserveA, reserveB);
        if (amountBOptimal <= amountB) {
            debrisB = amountB.sub(amountBOptimal);
            amountB = amountBOptimal;
        }
        else {
            const amountAOptimal = this.quote(amountB, reserveB, reserveA);
            if (amountAOptimal <= amountA) {
                debrisA = amountA.sub(amountAOptimal);
                amountA = amountAOptimal;
            }
        }
        const lpTokenA = amountA.mul(this.reserves[reserveIdx].totalSupply).div(reserveA);
        const lpTokenB = amountB.mul(this.reserves[reserveIdx].totalSupply).div(reserveB);
        const moreLp = lpTokenA < lpTokenB ? lpTokenA : lpTokenB;
        this.reserves[reserveIdx].r0 = this.reserves[reserveIdx].r0.add(!isReversed ? amountA : amountB);
        this.reserves[reserveIdx].r1 = this.reserves[reserveIdx].r1.add(!isReversed ? amountB : amountA);
        this.reserves[reserveIdx].totalSupply = this.reserves[reserveIdx].totalSupply.add(moreLp);
        return [moreLp, debrisA, debrisB];
    }
    quote(amountA, reserveA, reserveB) {
        return amountA.mul(reserveB).div(reserveA);
    }
    async computeReinvestLp(lpBefore, debrisBtoken, rewardPerBlock, reinvestBounty, reinvestPath, path, blockDiff) {
        const totalRewards = this.computeTotalRewards(lpBefore, rewardPerBlock, blockDiff);
        const reinvestFees = totalRewards.mul(reinvestBounty).div(10000);
        const reinvestLeft = totalRewards.sub(reinvestFees);
        const reinvestAmts = await this.computeSwapExactTokensForTokens(reinvestLeft, reinvestPath, true);
        return [
            reinvestFees,
            ...(await this.computeOneSidedOptimalLp(reinvestAmts[reinvestAmts.length - 1].add(debrisBtoken), path)),
        ];
    }
    async computeOneSidedOptimalLp(btokenAmount, path) {
        const optimalSwapAmt = await this.computeOneSidedOptimalSwap(btokenAmount, path);
        const amts = await this.computeSwapExactTokensForTokens(optimalSwapAmt, path, true);
        const [moreLp, debrisBtoken, debrisFtoken] = await this.computeAddLiquidity(path[0], path[1], btokenAmount.sub(optimalSwapAmt), amts[amts.length - 1]);
        return [moreLp, debrisBtoken, debrisFtoken];
    }
    async computeTwoSidesOptimalLp(btokenAmount, ftokenAmount, path) {
        const [swapAmt, isReversed] = await this.computeTwoSidesOptimalSwap(btokenAmount, ftokenAmount, path);
        const amts = isReversed
            ? await this.computeSwapExactTokensForTokens(swapAmt, [path[1], path[0]], true)
            : await this.computeSwapExactTokensForTokens(swapAmt, [path[0], path[1]], true);
        const [moreLp, debrisBtoken, debrisFtoken] = isReversed
            ? await this.computeAddLiquidity(path[0], path[1], btokenAmount.add(amts[amts.length - 1]), ftokenAmount.sub(swapAmt))
            : await this.computeAddLiquidity(path[0], path[1], btokenAmount.sub(swapAmt), ftokenAmount.add(amts[amts.length - 1]));
        return [moreLp, debrisBtoken, debrisFtoken];
    }
    async computeUnderlaying(amount, tokenA, tokenB) {
        const currLp = typechain_1.PancakePair__factory.connect(await this.factory.getPair(tokenA, tokenB), this.signer);
        const reserveIdx = this.reserves.findIndex((r) => r.lp === currLp.address);
        if (reserveIdx === -1) {
            throw new Error("computeUnderlaying: not found reserve");
        }
        const [r0, r1] = await currLp.getReserves();
        const [rA, rB] = (await currLp.token0()) === tokenA ? [r0, r1] : [r1, r0];
        const amountA = amount.mul(rA).div(this.reserves[reserveIdx].totalSupply);
        const amountB = amount.mul(rB).div(this.reserves[reserveIdx].totalSupply);
        return [amountA, amountB, rA, rB];
    }
    computeTotalRewards(lp, rewardPerBlock, blockDiff) {
        return lp.mul(rewardPerBlock.mul(blockDiff).mul(1e12).div(lp)).div(1e12);
    }
}
exports.SwapHelper = SwapHelper;
