"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@openzeppelin/test-helpers");
const ethers_1 = require("ethers");
const typechain_1 = require("../typechain");
const hardhat_1 = require("hardhat");
const deployToken_1 = require("./helpers/deployToken");
const swap_1 = require("./helpers/swap");
const chai_1 = __importDefault(require("chai"));
const deployStrategies_1 = require("./helpers/deployStrategies");
const helpers_1 = require("./helpers");
const deployWorker_1 = require("./helpers/deployWorker");
const deployVault_1 = require("./helpers/deployVault");
const ethereum_waffle_1 = require("ethereum-waffle");
chai_1.default.use(ethereum_waffle_1.solidity);
const { expect } = chai_1.default;
describe("Admin contract - emergency withdrawal", async () => {
    const CAKE_REWARD_PER_BLOCK = hardhat_1.ethers.utils.parseEther("0.076");
    const POOL_ID = 1;
    const REINVEST_BOUNTY_BPS = "100";
    // DEX (PCS)
    let factory;
    let router;
    let masterChef;
    let pancakeswapWorker01;
    let pancakeswapWorker02;
    let lp;
    let lpExt;
    let mockWBNB;
    // Tokens
    let baseToken;
    let targetToken;
    let testToken;
    let cake;
    // BC
    let feeCollector;
    let adminContract;
    // Signers
    let deployer;
    let alice;
    let bob;
    let clientOperator;
    let yieldFi;
    let deployerAddress;
    let aliceAddress;
    let yieldFiAddress;
    let clientOperatorAddress;
    // Protocol Manager
    let protocolManager;
    // Clients
    let exampleClient;
    // Protocol
    let vault;
    // Strats
    let addStrat;
    let addStratNoBase;
    let liqStrat;
    // Helpers & misc
    let swapHelper;
    // Connectors
    let baseTokenAsAlice;
    let exampleClientAsAlice;
    let exampleClientAsOperator;
    async function fixture() {
        [, , , , , deployer, alice, yieldFi, bob, clientOperator] = await hardhat_1.ethers.getSigners();
        [deployerAddress, aliceAddress, yieldFiAddress, , clientOperatorAddress] = await Promise.all([
            deployer.getAddress(),
            alice.getAddress(),
            yieldFi.getAddress(),
            bob.getAddress(),
            clientOperator.getAddress(),
        ]);
        baseToken = await (0, deployToken_1.deployToken)({
            name: "BASETOKEN",
            symbol: "BTOKEN",
            holders: [{ address: deployerAddress, amount: hardhat_1.ethers.utils.parseEther("10000") }],
        }, deployer);
        targetToken = await (0, deployToken_1.deployToken)({
            name: "TARGETTOKEN",
            symbol: "TTOKEN",
            holders: [{ address: deployerAddress, amount: hardhat_1.ethers.utils.parseEther("10000") }],
        }, deployer);
        testToken = await (0, deployToken_1.deployToken)({
            name: "TESTTOKEN",
            symbol: "TSTOKEN",
            holders: [{ address: deployerAddress, amount: hardhat_1.ethers.utils.parseEther("10000") }],
        }, deployer);
        mockWBNB = await (0, deployToken_1.deployWBNB)(deployer);
        await mockWBNB.mint(deployerAddress, hardhat_1.ethers.utils.parseEther("10000"));
        [factory, router, cake, , masterChef] = await (0, helpers_1.deployPancakeV2)(mockWBNB, CAKE_REWARD_PER_BLOCK, [{ address: deployerAddress, amount: hardhat_1.ethers.utils.parseEther("10000") }], deployer);
        // Setup general protocol manager
        protocolManager = (await (0, helpers_1.deployProxyContract)("ProtocolManager", [[deployerAddress]], deployer));
        await protocolManager.setStables([mockWBNB.address]);
        feeCollector = (await (0, helpers_1.deployProxyContract)("FeeCollector", [baseToken.address, "500", protocolManager.address], deployer));
        adminContract = (await (0, helpers_1.deployProxyContract)("Admin", [protocolManager.address, feeCollector.address], deployer));
        await protocolManager.approveAdminContract(adminContract.address);
        // Treasury acc = yieldFi protocol owner
        [vault, , ,] = await (0, deployVault_1.deployVault)(mockWBNB, baseToken, protocolManager.address, feeCollector.address, yieldFiAddress, deployer);
        // Setup strategies
        [addStrat, addStratNoBase, liqStrat] = await (0, deployStrategies_1.deployPancakeStrategies)(router, deployer, protocolManager);
        // Setup BTOKEN-FTOKEN pair on Pancakeswap
        // Add lp to masterChef's pool
        await factory.createPair(baseToken.address, targetToken.address);
        await factory.createPair(testToken.address, targetToken.address);
        lp = typechain_1.PancakePair__factory.connect(await factory.getPair(targetToken.address, baseToken.address), deployer);
        lpExt = typechain_1.PancakePair__factory.connect(await factory.getPair(targetToken.address, testToken.address), deployer);
        await masterChef.add(1, lp.address, true);
        await masterChef.add(2, lpExt.address, true);
        /// Setup PancakeswapWorker
        pancakeswapWorker01 = await (0, deployWorker_1.deployPancakeWorker)(vault, "Worker01", baseToken, masterChef, router, POOL_ID, [cake.address, mockWBNB.address, baseToken.address], 0, REINVEST_BOUNTY_BPS, protocolManager.address, deployer);
        pancakeswapWorker02 = await (0, deployWorker_1.deployPancakeWorker)(vault, "Worker02", baseToken, masterChef, router, POOL_ID + 1, // Next alloc point
        [cake.address, mockWBNB.address, baseToken.address], 0, REINVEST_BOUNTY_BPS, protocolManager.address, deployer);
        await pancakeswapWorker01.setStrategies([
            addStrat.address,
            addStratNoBase.address,
            liqStrat.address,
        ]);
        await pancakeswapWorker02.setStrategies([
            addStrat.address,
            addStratNoBase.address,
            liqStrat.address,
        ]);
        swapHelper = new swap_1.SwapHelper(factory.address, router.address, ethers_1.BigNumber.from(9975), ethers_1.BigNumber.from(10000), deployer);
        await swapHelper.addLiquidities([
            {
                token0: baseToken,
                token1: targetToken,
                amount0desired: hardhat_1.ethers.utils.parseEther("1000"),
                amount1desired: hardhat_1.ethers.utils.parseEther("1000"),
            },
            {
                token0: cake,
                token1: mockWBNB,
                amount0desired: hardhat_1.ethers.utils.parseEther("1000"),
                amount1desired: hardhat_1.ethers.utils.parseEther("1000"),
            },
            {
                token0: baseToken,
                token1: mockWBNB,
                amount0desired: hardhat_1.ethers.utils.parseEther("1000"),
                amount1desired: hardhat_1.ethers.utils.parseEther("1000"),
            },
            {
                token0: targetToken,
                token1: mockWBNB,
                amount0desired: hardhat_1.ethers.utils.parseEther("1000"),
                amount1desired: hardhat_1.ethers.utils.parseEther("1000"),
            },
            {
                token0: testToken,
                token1: mockWBNB,
                amount0desired: hardhat_1.ethers.utils.parseEther("1000"),
                amount1desired: hardhat_1.ethers.utils.parseEther("1000"),
            },
            {
                token0: testToken,
                token1: baseToken,
                amount0desired: hardhat_1.ethers.utils.parseEther("1000"),
                amount1desired: hardhat_1.ethers.utils.parseEther("1000"),
            },
            {
                token0: testToken,
                token1: targetToken,
                amount0desired: hardhat_1.ethers.utils.parseEther("1000"),
                amount1desired: hardhat_1.ethers.utils.parseEther("1000"),
            },
        ]);
        // Add worker to the register
        await protocolManager.approveWorkers([pancakeswapWorker01.address, pancakeswapWorker02.address], true);
        // Clients
        exampleClient = (await (0, helpers_1.deployProxyContract)("Client", [
            "Binance",
            "Binance Client",
            protocolManager.address,
            feeCollector.address,
            [clientOperatorAddress],
            [hardhat_1.ethers.constants.AddressZero], // Additional withdrawer
        ], deployer));
        exampleClientAsOperator = exampleClient.connect(clientOperator);
        // Enable workers on the client side
        await exampleClientAsOperator.enableFarms([
            pancakeswapWorker01.address,
            pancakeswapWorker02.address,
        ]);
        // Whitelist client
        await protocolManager.approveClients([exampleClient.address], true);
        await protocolManager.approveVaults([vault.address], true);
        // Signers
        baseTokenAsAlice = baseToken.connect(alice);
        exampleClientAsAlice = exampleClient.connect(alice);
    }
    beforeEach(async () => {
        await hardhat_1.waffle.loadFixture(fixture);
    });
    context("emergency withdrawal", async () => {
        it("should execute emergency withdrawal procedure", async () => {
            // Well, we need her
            await exampleClientAsOperator.whitelistUsers([aliceAddress], true);
            // Set fees amounts for further calcs
            await exampleClientAsOperator.setFarmsFee([pancakeswapWorker01.address, pancakeswapWorker02.address], 1000 // 10%
            );
            await adminContract.setFarmsFee([pancakeswapWorker01.address, pancakeswapWorker02.address], 1000); // 10%
            const DEPOSIT_AMOUNT = hardhat_1.ethers.utils.parseEther("1");
            const MINT_AMOUNT = hardhat_1.ethers.utils.parseEther("6");
            await baseToken.mint(aliceAddress, MINT_AMOUNT);
            await baseTokenAsAlice.approve(exampleClient.address, MINT_AMOUNT);
            await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);
            await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);
            await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);
            await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT);
            await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT);
            await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT);
            // Emulate rewards gathered
            await cake.transfer(pancakeswapWorker01.address, hardhat_1.ethers.utils.parseEther("10"));
            await cake.transfer(pancakeswapWorker02.address, hardhat_1.ethers.utils.parseEther("10"));
            // Whole base token should have been utilized
            expect(await baseToken.balanceOf(aliceAddress)).to.be.bignumber.that.eql(ethers_1.BigNumber.from("0"));
            await adminContract.emergencyWithdraw([pancakeswapWorker01.address, pancakeswapWorker02.address], [exampleClient.address, yieldFiAddress /* Treasury address! */]);
            // 20 CAKE ~= 20 BUSD since 1:1 initial ratio -  2 * 10% fee * 10 CAKE  + 6 USD initial ->  ~= 21.550731836754514394 (price offset due to pool swap)
            // Alice should get her assets back
            expect(await baseToken.balanceOf(aliceAddress)).to.be.bignumber.that.eql(hardhat_1.ethers.utils.parseEther("21.550731836754514394"));
            // All rewards should have been paid out
            expect(await vault.rewards(1 /* PID: 1 */)).to.be.bignumber.that.eql(ethers_1.BigNumber.from("0"));
            expect(await vault.rewards(1 /* PID: 2 */)).to.be.bignumber.that.eql(ethers_1.BigNumber.from("0"));
            expect(await vault.rewardsToCollect(aliceAddress)).to.be.bignumber.that.eql(ethers_1.BigNumber.from("0"));
            // CAKE-balances of given workers should be zero-ed
            expect(await cake.balanceOf(pancakeswapWorker01.address)).to.be.bignumber.that.eql(ethers_1.BigNumber.from("0"));
            expect(await cake.balanceOf(pancakeswapWorker02.address)).to.be.bignumber.that.eql(ethers_1.BigNumber.from("0"));
            // Vault should be empty at this point since whole coverage has been paid out
            expect(await cake.balanceOf(vault.address)).to.be.bignumber.that.eql(ethers_1.BigNumber.from("0"));
            expect(await baseToken.balanceOf(vault.address)).to.be.bignumber.that.eql(ethers_1.BigNumber.from("0"));
            // Client fee should have been paid out as well - ~ 2 CAKE since 10 % * 10 CAKE total * 2 (may be less)
            expect(await baseToken.balanceOf(exampleClient.address)).to.be.bignumber.that.eql(hardhat_1.ethers.utils.parseEther("1.947079918089295738"));
            // YieldFee treasury address has already been supplied with fee, same formula above since both yieldFi and client have 10% fee set
            expect(await baseToken.balanceOf(yieldFiAddress)).to.be.bignumber.that.eql(hardhat_1.ethers.utils.parseEther("1.947079918089295738"));
        });
    });
});
