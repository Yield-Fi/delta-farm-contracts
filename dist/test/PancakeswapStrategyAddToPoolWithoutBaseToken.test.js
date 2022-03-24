"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@openzeppelin/test-helpers");
const typechain_1 = require("../typechain");
const hardhat_1 = require("hardhat");
const ethers_1 = require("ethers");
const chai_1 = __importDefault(require("chai"));
const ethereum_waffle_1 = require("ethereum-waffle");
const units_1 = require("@ethersproject/units");
const helpers_1 = require("./helpers");
const swap_1 = require("./helpers/swap");
const abi_1 = require("@ethersproject/abi");
const assert_1 = require("./helpers/assert");
chai_1.default.use(ethereum_waffle_1.solidity);
const { expect } = chai_1.default;
describe("PancakeswapStrategyAddToPoolWithoutBaseToken", () => {
    const CAKE_PER_BLOCK = (0, units_1.parseEther)("1");
    let protocolManager;
    let deployer;
    let deployerAddress;
    let account1;
    let account1Address;
    let BaseToken;
    let Token0;
    let Token1;
    let lpTOK0_TOK1;
    let PancakeFactory;
    let PancakeRouterV2;
    let swapHelper;
    let strategy;
    async function fixture() {
        [deployer, account1] = await hardhat_1.ethers.getSigners();
        [deployerAddress, account1Address] = await Promise.all([
            deployer.getAddress(),
            account1.getAddress(),
        ]);
        protocolManager = (await (0, helpers_1.deployProxyContract)("ProtocolManager", [[await deployer.getAddress()]], deployer));
        [BaseToken, Token0, Token1] = await (0, helpers_1.deployTokens)([
            {
                name: "BASE",
                symbol: "BASE",
                holders: [
                    {
                        address: account1Address,
                        amount: (0, units_1.parseEther)("100"),
                    },
                    {
                        address: deployerAddress,
                        amount: (0, units_1.parseEther)("23000000"),
                    },
                ],
            },
            {
                name: "TOKEN1",
                symbol: "TOK1",
                holders: [
                    {
                        address: account1Address,
                        amount: (0, units_1.parseEther)("100"),
                    },
                    {
                        address: deployerAddress,
                        amount: (0, units_1.parseEther)("2000000"),
                    },
                ],
            },
            {
                name: "TOKEN2",
                symbol: "TOK2",
                holders: [
                    {
                        address: account1Address,
                        amount: (0, units_1.parseEther)("100"),
                    },
                    {
                        address: deployerAddress,
                        amount: (0, units_1.parseEther)("2000000"),
                    },
                ],
            },
        ], deployer);
        const MockWBNB = (await (0, helpers_1.deployContract)("MockWBNB", [], deployer));
        [PancakeFactory, PancakeRouterV2] = await (0, helpers_1.deployPancakeV2)(MockWBNB, CAKE_PER_BLOCK, [{ address: deployerAddress, amount: (0, units_1.parseEther)("200") }], deployer);
        await protocolManager.setStables([MockWBNB.address]);
        await PancakeFactory.createPair(Token0.address, Token1.address);
        const lp = await PancakeFactory.getPair(Token0.address, Token1.address);
        lpTOK0_TOK1 = typechain_1.PancakePair__factory.connect(lp, deployer);
        swapHelper = new swap_1.SwapHelper(PancakeFactory.address, PancakeRouterV2.address, ethers_1.BigNumber.from(9975), ethers_1.BigNumber.from(10000), deployer);
        await swapHelper.addLiquidities([
            {
                token0: BaseToken,
                token1: Token0,
                amount0desired: hardhat_1.ethers.utils.parseEther("10000"),
                amount1desired: hardhat_1.ethers.utils.parseEther("100000"),
            },
            {
                token0: BaseToken,
                token1: Token1,
                amount0desired: hardhat_1.ethers.utils.parseEther("100000"),
                amount1desired: hardhat_1.ethers.utils.parseEther("100000"),
            },
            {
                token0: Token0,
                token1: Token1,
                amount0desired: hardhat_1.ethers.utils.parseEther("100000"),
                amount1desired: hardhat_1.ethers.utils.parseEther("10000"),
            },
        ]);
        strategy = (await (0, helpers_1.deployProxyContract)("PancakeswapStrategyAddToPoolWithoutBaseToken", [PancakeRouterV2.address, protocolManager.address], deployer));
    }
    beforeEach(async () => {
        await hardhat_1.waffle.loadFixture(fixture);
    });
    it("should revert on bad calldata", async () => {
        await expect(strategy.execute("0x1234")).to.be.reverted;
    });
    it("should convert all base token to LP tokens at best rate", async () => {
        const baseToken__account1 = typechain_1.MockToken__factory.connect(BaseToken.address, account1);
        const strategy__account1 = typechain_1.PancakeswapStrategyAddToPoolWithoutBaseToken__factory.connect(strategy.address, account1);
        // Transfer 10 BASE TOKEN to the strategy
        await baseToken__account1.transfer(strategy.address, (0, units_1.parseEther)("10"));
        expect((await BaseToken.balanceOf(strategy.address)).toString()).to.be.eq((0, units_1.parseEther)("10").toString());
        await strategy__account1.execute(abi_1.defaultAbiCoder.encode(["address", "address", "address", "uint256"], [BaseToken.address, Token0.address, Token1.address, 0]));
        (0, assert_1.assertAlmostEqual)((await lpTOK0_TOK1.balanceOf(account1Address)).toString(), (0, units_1.parseEther)("15.763997536318553037").toString());
        expect((await BaseToken.balanceOf(strategy.address)).toString()).to.be.eq((0, units_1.parseEther)("0").toString());
    });
    it("should revert when amount of received lp tokens is too low", async () => {
        const baseToken__account1 = typechain_1.MockToken__factory.connect(BaseToken.address, account1);
        const strategy__account1 = typechain_1.PancakeswapStrategyAddToPoolWithoutBaseToken__factory.connect(strategy.address, account1);
        // Transfer 1 BASE TOKEN to the strategy
        await baseToken__account1.transfer(strategy.address, (0, units_1.parseEther)("1"));
        expect((await BaseToken.balanceOf(strategy.address)).toString()).to.be.eq((0, units_1.parseEther)("1").toString());
        expect(strategy__account1.execute(abi_1.defaultAbiCoder.encode(["address", "address", "address", "uint256"], [BaseToken.address, Token0.address, Token1.address, (0, units_1.parseEther)("10")]))).to.be.revertedWith("PancakeswapStrategyAddToPoolWithoutBaseToken->execute: insufficient LP tokens received");
    });
    it("Should estimate amounts of base token after split and converting to token0 and token1", async () => {
        const [firstPartOfBaseToken, secondPartOfBaseToken, amountOfToken0, amountOfToken1] = await strategy.callStatic.estimateAmounts(BaseToken.address, Token0.address, Token1.address, (0, units_1.parseEther)("1"));
        expect(firstPartOfBaseToken.toString()).to.be.eq((0, units_1.parseEther)("0.5").toString());
        expect(secondPartOfBaseToken.toString()).to.be.eq((0, units_1.parseEther)("0.5").toString());
        /// 1 BASE TOKEN = 10 TOKEN0
        /// 0.5 BASE TOKEN ~= 5 TOKEN0 - some trading fee
        expect(amountOfToken0.toString()).to.be.eq((0, units_1.parseEther)("4.987251260843365437").toString());
        /// 1 BASE TOKEN = 1 TOKEN1
        /// 0.5 BASE TOKEN ~= 0.5 TOKEN0 - some trading fee
        expect(amountOfToken1.toString()).to.be.eq((0, units_1.parseEther)("0.498747512496781422").toString());
    });
});
