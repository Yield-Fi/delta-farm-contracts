"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../utils/config");
const hardhat_1 = require("hardhat");
const logger_1 = require("../utils/logger");
const units_1 = require("@ethersproject/units");
const func = async function ({ network }) {
    if (network.name === "mainnet") {
        console.log("This deployment script should be run against testnet only");
        return;
    }
    const CAKE_REWARD_PER_BLOCK = hardhat_1.ethers.utils.parseEther("3");
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    (0, logger_1.logger)("--> Deploying Pancakeswap v2...");
    const PancakeFactoryFactory = await hardhat_1.ethers.getContractFactory("PancakeFactory", deployer);
    const PancakeFactory = await PancakeFactoryFactory.deploy(deployer.address);
    await PancakeFactory.deployed();
    (0, logger_1.logger)(` - PancakeFactory is deployed at ${PancakeFactory.address}`);
    const PancakeRouterFactory = await hardhat_1.ethers.getContractFactory("PancakeRouterV2", deployer);
    const PancakeRouter = await PancakeRouterFactory.deploy(PancakeFactory.address, config.tokens.WBNB);
    await PancakeRouter.deployed();
    (0, logger_1.logger)(` - PancakeRouter deployed at ${PancakeRouter.address}`);
    const CAKEFactory = await hardhat_1.ethers.getContractFactory("CakeToken", deployer);
    const CAKE = await CAKEFactory.deploy();
    await CAKE.deployed();
    await CAKE["mint(address,uint256)"](deployer.address, (0, units_1.parseEther)("100000000"));
    (0, logger_1.logger)(` - Cake token deployed at ${CAKE.address}`);
    const SYRUPFactory = await hardhat_1.ethers.getContractFactory("SyrupBar", deployer);
    const SYRUP = await SYRUPFactory.deploy(CAKE.address);
    (0, logger_1.logger)(` - Syrup Bar token deployed at ${SYRUP.address}`);
    const MasterChefFactory = await hardhat_1.ethers.getContractFactory("PancakeMasterChef", deployer);
    const MasterChef = await MasterChefFactory.deploy(CAKE.address, SYRUP.address, deployer.address, CAKE_REWARD_PER_BLOCK, 0);
    (0, logger_1.logger)(` - Pancake MasterChef deployed at ${MasterChef.address}`);
    await CAKE.transferOwnership(MasterChef.address, { gasLimit: "210000" });
    await SYRUP.transferOwnership(MasterChef.address, { gasLimit: "210000" });
};
exports.default = func;
func.tags = ["PancakeswapV2"];
