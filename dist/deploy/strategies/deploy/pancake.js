"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const typechain_1 = require("../../../typechain");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const deployFunc = async () => {
    const config = (0, config_1.getConfig)();
    const [deployer] = await hardhat_1.ethers.getSigners();
    const ProtocolManager = typechain_1.ProtocolManager__factory.connect(config.protocolManager, deployer);
    (0, logger_1.logger)("---> Deploying strategies for the pancakeswap workers... <---");
    const AddToPoolWithBaseTokenStrategyFactory = await hardhat_1.ethers.getContractFactory("PancakeswapStrategyAddToPoolWithBaseToken", deployer);
    const AddToPoolWithBaseTokenStrategy = (await hardhat_1.upgrades.deployProxy(AddToPoolWithBaseTokenStrategyFactory, [config.dex.pancakeswap.RouterV2, ProtocolManager.address]));
    await AddToPoolWithBaseTokenStrategy.deployed();
    (0, logger_1.logger)(`- PancakeswapStrategyAddToPoolWithBaseToken deployed at ${AddToPoolWithBaseTokenStrategy.address}`);
    const AddToPoolWithoutBaseTokenStrategyFactory = await hardhat_1.ethers.getContractFactory("PancakeswapStrategyAddToPoolWithoutBaseToken", deployer);
    const AddToPoolWithoutBaseTokenStrategy = (await hardhat_1.upgrades.deployProxy(AddToPoolWithoutBaseTokenStrategyFactory, [config.dex.pancakeswap.RouterV2, ProtocolManager.address]));
    await AddToPoolWithoutBaseTokenStrategy.deployed();
    (0, logger_1.logger)(`- PancakeswapStrategyAddToPoolWithoutBaseToken deployed at ${AddToPoolWithoutBaseTokenStrategy.address}`);
    const LiquidateStrategyFactory = await hardhat_1.ethers.getContractFactory("PancakeswapStrategyLiquidate", deployer);
    const LiquidateStrategy = await hardhat_1.upgrades.deployProxy(LiquidateStrategyFactory, [
        config.dex.pancakeswap.RouterV2,
        ProtocolManager.address,
    ]);
    await LiquidateStrategy.deployed();
    (0, logger_1.logger)(`- LiquidateStrategy deployed at ${LiquidateStrategy.address}`);
    await ProtocolManager.approveStrategies([
        AddToPoolWithBaseTokenStrategy.address,
        AddToPoolWithoutBaseTokenStrategy.address,
        LiquidateStrategy.address,
    ], true);
};
exports.default = deployFunc;
deployFunc.tags = ["PancakeswapStrategies"];
