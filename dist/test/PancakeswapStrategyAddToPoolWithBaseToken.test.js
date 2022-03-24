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
describe("PancakeswapStrategyAddToPoolWithBaseToken", () => {
    const FOREVER = "2000000000";
    let protocolManager;
    /// Pancakeswap-related instance(s)
    let factoryV2;
    let routerV2;
    let lpV2;
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
    // Contract Signer
    let baseTokenAsAlice;
    let baseTokenAsBob;
    let lpAsBob;
    let farmingTokenAsAlice;
    let routerV2AsAlice;
    let stratAsBob;
    async function fixture() {
        [deployer, alice, bob] = await hardhat_1.ethers.getSigners();
        protocolManager = (await (0, helpers_1.deployProxyContract)("ProtocolManager", [[await deployer.getAddress()]], deployer));
        // Setup Pancakeswap
        const PancakeFactory = (await hardhat_1.ethers.getContractFactory("PancakeFactory", deployer));
        factoryV2 = await PancakeFactory.deploy(await deployer.getAddress());
        await factoryV2.deployed();
        const WBNB = (await hardhat_1.ethers.getContractFactory("WBNB", deployer));
        wbnb = await WBNB.deploy();
        await factoryV2.deployed();
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
        await farmingToken.mint(await alice.getAddress(), hardhat_1.ethers.utils.parseEther("10000"));
        await farmingToken.mint(await bob.getAddress(), hardhat_1.ethers.utils.parseEther("10000"));
        await factoryV2.createPair(baseToken.address, farmingToken.address);
        lpV2 = typechain_1.PancakePair__factory.connect(await factoryV2.getPair(farmingToken.address, baseToken.address), deployer);
        const PancakeswapStrategyAddToPoolWithBaseToken = (await hardhat_1.ethers.getContractFactory("PancakeswapStrategyAddToPoolWithBaseToken", deployer));
        strat = (await hardhat_1.upgrades.deployProxy(PancakeswapStrategyAddToPoolWithBaseToken, [
            routerV2.address,
            protocolManager.address,
        ]));
        await strat.deployed();
        // Assign contract signer
        baseTokenAsAlice = typechain_1.MockToken__factory.connect(baseToken.address, alice);
        baseTokenAsBob = typechain_1.MockToken__factory.connect(baseToken.address, bob);
        farmingTokenAsAlice = typechain_1.MockToken__factory.connect(farmingToken.address, alice);
        routerV2AsAlice = typechain_1.PancakeRouterV2__factory.connect(routerV2.address, alice);
        lpAsBob = typechain_1.PancakePair__factory.connect(lpV2.address, bob);
        stratAsBob = typechain_1.PancakeswapStrategyAddToPoolWithBaseToken__factory.connect(strat.address, bob);
    }
    beforeEach(async () => {
        await hardhat_1.waffle.loadFixture(fixture);
    });
    it("should revert on bad calldata", async () => {
        // Bob passes some bad calldata that can't be decoded
        await expect(stratAsBob.execute("0x1234")).to.be.reverted;
    });
    it("should convert all BTOKEN to LP tokens at best rate", async () => {
        // Alice adds 0.1 FTOKEN + 1 WBTC
        await baseTokenAsAlice.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("10"));
        await farmingTokenAsAlice.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("1"));
        // Add liquidity to the WBTC-FTOKEN pool on Pancakeswap
        await routerV2AsAlice.addLiquidity(baseToken.address, farmingToken.address, hardhat_1.ethers.utils.parseEther("10"), hardhat_1.ethers.utils.parseEther("1"), "0", "0", await alice.getAddress(), FOREVER);
        // Bob transfer 0.1 WBTC to StrategyAddBaseTokenOnly first
        await baseTokenAsBob.transfer(strat.address, hardhat_1.ethers.utils.parseEther("0.1"));
        // Bob uses AddBaseTokenOnly strategy to add 0.1 WBTC
        await stratAsBob.execute(hardhat_1.ethers.utils.defaultAbiCoder.encode(["address", "address", "uint256"], [baseToken.address, farmingToken.address, "0"]));
        expect(await (await lpV2.balanceOf(await bob.getAddress())).toString()).to.eq((0, units_1.parseEther)("0.015732724677454621").toString());
        expect(await (await lpV2.balanceOf(strat.address)).toString()).to.eq((0, units_1.parseEther)("0").toString());
        // Bob uses AddBaseTokenOnly strategy to add another 0.1 WBTC
        await baseTokenAsBob.transfer(strat.address, hardhat_1.ethers.utils.parseEther("0.1"));
        await lpAsBob.transfer(strat.address, hardhat_1.ethers.utils.parseEther("0.015415396042372718"));
        await stratAsBob.execute(hardhat_1.ethers.utils.defaultAbiCoder.encode(["address", "address", "uint256"], [baseToken.address, farmingToken.address, hardhat_1.ethers.utils.parseEther("0.01")]));
        expect((await lpV2.balanceOf(await bob.getAddress())).toString()).to.eq((0, units_1.parseEther)("0.031387948248123750").toString());
        expect((await lpV2.balanceOf(strat.address)).toString()).to.eq((0, units_1.parseEther)("0").toString());
        // expect((await farmingToken.balanceOf(strat.address)).toString()).to.eq(
        //   parseEther("0").toString()
        // );
        // expect((await baseToken.balanceOf(strat.address)).toString()).to.eq(parseEther("0").toString());
        // Bob uses AddBaseTokenOnly strategy yet again, but now with an unreasonable min LP request
        await baseTokenAsBob.transfer(strat.address, hardhat_1.ethers.utils.parseEther("0.1"));
        await expect(stratAsBob.execute(hardhat_1.ethers.utils.defaultAbiCoder.encode(["address", "address", "uint256"], [baseToken.address, farmingToken.address, hardhat_1.ethers.utils.parseEther("0.05")]))).to.be.revertedWith("insufficient LP tokens received");
    });
    it("Should estimate amounts of base token after split and converting to token0", async () => {
        await baseTokenAsAlice.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("1000"));
        await farmingTokenAsAlice.approve(routerV2.address, hardhat_1.ethers.utils.parseEther("10000"));
        await routerV2AsAlice.addLiquidity(baseToken.address, farmingToken.address, hardhat_1.ethers.utils.parseEther("1000"), hardhat_1.ethers.utils.parseEther("10000"), "0", "0", await alice.getAddress(), FOREVER);
        const [firstPartOfBaseToken, secondPartOfBaseToken, amountOfToken0, amountOfToken1] = await strat.callStatic.estimateAmounts(baseToken.address, baseToken.address, farmingToken.address, (0, units_1.parseEther)("1"));
        expect(firstPartOfBaseToken.toString()).to.be.eq((0, units_1.parseEther)("0.500000000000000000").toString());
        expect(secondPartOfBaseToken.toString()).to.be.eq((0, units_1.parseEther)("0.500000000000000000").toString());
        expect(firstPartOfBaseToken.add(secondPartOfBaseToken).toString()).to.be.eq((0, units_1.parseEther)("1").toString());
        expect(amountOfToken0.toString()).to.be.eq((0, units_1.parseEther)("0.500000000000000000").toString());
        /// 1 BASE TOKEN = 10 TOKEN1
        /// 0.5 BASE TOKEN ~= 0.5 TOKEN0 - some trading fee
        expect(amountOfToken1.toString()).to.be.eq((0, units_1.parseEther)("4.985013724404953029").toString());
    });
});
