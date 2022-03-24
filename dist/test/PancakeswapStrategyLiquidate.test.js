"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@openzeppelin/test-helpers");
const typechain_1 = require("../typechain");
const hardhat_1 = require("hardhat");
const chai_1 = __importDefault(require("chai"));
const ethereum_waffle_1 = require("ethereum-waffle");
const units_1 = require("@ethersproject/units");
const helpers_1 = require("./helpers");
chai_1.default.use(ethereum_waffle_1.solidity);
const { expect } = chai_1.default;
describe("Pancakeswap - StrategyLiquidate", () => {
    const FOREVER = "2000000000";
    let protocolManager;
    /// Pancake-related instance(s)
    let factoryV2;
    let routerV2;
    let lp;
    /// Token-related instance(s)
    let wbnb;
    let baseToken;
    let farmingToken;
    /// Strategy-ralted instance(s)
    let strat;
    // Accounts
    let deployer;
    let alice;
    let bob;
    let worker;
    // Contract Signer
    let baseTokenAsAlice;
    let baseTokenAsBob;
    let lpAsBob;
    let lpAsAlice;
    let farmingTokenAsAlice;
    let farmingTokenAsBob;
    let routerAsAlice;
    let routerAsBob;
    let stratAsWorker;
    async function fixture() {
        [deployer, alice, bob, worker] = await hardhat_1.ethers.getSigners();
        protocolManager = (await (0, helpers_1.deployProxyContract)("ProtocolManager", [[await deployer.getAddress()]], deployer));
        // Setup Pancakeswap
        const PancakeFactoryV2 = (await hardhat_1.ethers.getContractFactory("PancakeFactory", deployer));
        factoryV2 = await PancakeFactoryV2.deploy(await deployer.getAddress());
        await factoryV2.deployed();
        const WBNB = (await hardhat_1.ethers.getContractFactory("WBNB", deployer));
        wbnb = await WBNB.deploy();
        await wbnb.deployed();
        await protocolManager.setStables([wbnb.address]);
        const PancakeRouterV2 = (await hardhat_1.ethers.getContractFactory("PancakeRouterV2", deployer));
        routerV2 = await PancakeRouterV2.deploy(factoryV2.address, wbnb.address);
        await routerV2.deployed();
        /// Setup token stuffs
        const MockToken = (await hardhat_1.ethers.getContractFactory("MockToken", deployer));
        baseToken = (await hardhat_1.upgrades.deployProxy(MockToken, ["BTOKEN", "BTOKEN"]));
        await baseToken.deployed();
        await baseToken.mint(await alice.getAddress(), hardhat_1.ethers.utils.parseEther("100000"));
        await baseToken.mint(await bob.getAddress(), hardhat_1.ethers.utils.parseEther("100000"));
        farmingToken = (await hardhat_1.upgrades.deployProxy(MockToken, ["FTOKEN", "FTOKEN"]));
        await farmingToken.deployed();
        await farmingToken.mint(await alice.getAddress(), hardhat_1.ethers.utils.parseEther("100000"));
        await farmingToken.mint(await bob.getAddress(), hardhat_1.ethers.utils.parseEther("100000"));
        await factoryV2.createPair(baseToken.address, farmingToken.address);
        lp = typechain_1.PancakePair__factory.connect(await factoryV2.getPair(farmingToken.address, baseToken.address), deployer);
        const PancakeswapV2StrategyLiquidate = (await hardhat_1.ethers.getContractFactory("PancakeswapStrategyLiquidate", deployer));
        strat = (await hardhat_1.upgrades.deployProxy(PancakeswapV2StrategyLiquidate, [
            routerV2.address,
            protocolManager.address,
        ]));
        await strat.deployed();
        // Assign contract signer
        baseTokenAsAlice = typechain_1.MockToken__factory.connect(baseToken.address, alice);
        baseTokenAsBob = typechain_1.MockToken__factory.connect(baseToken.address, bob);
        farmingTokenAsAlice = typechain_1.MockToken__factory.connect(farmingToken.address, alice);
        farmingTokenAsBob = typechain_1.MockToken__factory.connect(farmingToken.address, bob);
        routerAsAlice = typechain_1.PancakeRouterV2__factory.connect(routerV2.address, alice);
        routerAsBob = typechain_1.PancakeRouterV2__factory.connect(routerV2.address, bob);
        lpAsBob = typechain_1.PancakePair__factory.connect(lp.address, bob);
        lpAsAlice = typechain_1.PancakePair__factory.connect(lp.address, alice);
        stratAsWorker = strat.connect(worker);
    }
    beforeEach(async () => {
        await hardhat_1.waffle.loadFixture(fixture);
    });
    it("should convert all LP tokens back to baseToken", async () => {
        // Alice adds 100 FTOKEN + 1000 BTOKEN
        await baseTokenAsAlice.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("1000"));
        await farmingTokenAsAlice.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("100"));
        await routerAsAlice.addLiquidity(baseToken.address, farmingToken.address, hardhat_1.ethers.utils.parseEther("1000"), hardhat_1.ethers.utils.parseEther("100"), "0", "0", await alice.getAddress(), FOREVER);
        // Bob tries to add 1000 FTOKEN + 1000 BTOKEN (but obviously can only add 100 FTOKEN)
        await baseTokenAsBob.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("1000"));
        await farmingTokenAsBob.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("1000"));
        await routerAsBob.addLiquidity(baseToken.address, farmingToken.address, hardhat_1.ethers.utils.parseEther("1000"), hardhat_1.ethers.utils.parseEther("1000"), "0", "0", await bob.getAddress(), FOREVER);
        expect((await baseToken.balanceOf(await bob.getAddress())).toString()).to.eq((0, units_1.parseEther)("99000").toString());
        expect((await farmingToken.balanceOf(await bob.getAddress())).toString()).to.eq((0, units_1.parseEther)("99900").toString());
        expect((await lp.balanceOf(await bob.getAddress())).toString()).to.eq((0, units_1.parseEther)("316.227766016837933199").toString());
        // Bob uses liquidate strategy to withdraw more BTOKEN than he can
        await lpAsBob.transfer(strat.address, hardhat_1.ethers.utils.parseEther("316.227766016837933199"));
        await expect(strat.execute(hardhat_1.ethers.utils.defaultAbiCoder.encode(["address", "address", "address", "uint256", "address"], [
            baseToken.address,
            baseToken.address,
            farmingToken.address,
            hardhat_1.ethers.utils.parseEther("20000"),
            await bob.getAddress(),
        ]))).to.be.revertedWith("PancakeswapStrategyLiquidate: Insufficient base token amount");
        // Bob uses liquidate strategy to turn all LPs back to BTOKEN
        await strat.execute(hardhat_1.ethers.utils.defaultAbiCoder.encode(["address", "address", "address", "uint256", "address"], [
            baseToken.address,
            baseToken.address,
            farmingToken.address,
            hardhat_1.ethers.utils.parseEther("0"),
            await bob.getAddress(),
        ]));
        expect((await lp.balanceOf(strat.address)).toString()).to.eq(hardhat_1.ethers.utils.parseEther("0"));
        expect((await lp.balanceOf(await bob.getAddress())).toString()).to.eq((0, units_1.parseEther)("0").toString());
        expect((await baseToken.balanceOf(lp.address)).toString()).to.eq((0, units_1.parseEther)("500.625782227784730914").toString());
        expect((await farmingToken.balanceOf(lp.address)).toString()).to.eq((0, units_1.parseEther)("200.000000000000000000").toString());
    });
    it("should convert partial of lp tokens", async () => {
        // Alice adds 100 FTOKEN + 1000 BTOKEN
        await baseTokenAsAlice.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("1000"));
        await farmingTokenAsAlice.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("100"));
        await routerAsAlice.addLiquidity(baseToken.address, farmingToken.address, hardhat_1.ethers.utils.parseEther("100"), hardhat_1.ethers.utils.parseEther("10"), "0", "0", await alice.getAddress(), FOREVER);
        // Bob tries to add 1000 FTOKEN + 1000 BTOKEN (but obviously can only add 100 FTOKEN)
        await baseTokenAsBob.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("10000"));
        await farmingTokenAsBob.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("10000"));
        await routerAsBob.addLiquidity(baseToken.address, farmingToken.address, hardhat_1.ethers.utils.parseEther("10000"), hardhat_1.ethers.utils.parseEther("10000"), "0", "0", await bob.getAddress(), FOREVER);
        // Alice uses liquidate strategy remove partial of liquidity
        expect((await lp.balanceOf(await alice.getAddress())).toString()).to.eq((0, units_1.parseEther)("31.622776601683792319").toString());
        await lpAsAlice.transfer(strat.address, hardhat_1.ethers.utils.parseEther("31.622776601683792319"));
        await stratAsWorker.execute(hardhat_1.ethers.utils.defaultAbiCoder.encode(["address", "address", "address", "uint256", "address"], [
            baseToken.address,
            baseToken.address,
            farmingToken.address,
            hardhat_1.ethers.utils.parseEther("15"),
            await worker.getAddress(),
        ]));
        expect(await baseToken.balanceOf(await worker.getAddress())).to.eq((0, units_1.parseEther)("15.068737002192638083").toString());
    });
});
