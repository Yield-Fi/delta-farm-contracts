"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const upgradeFunc = async () => {
    const config = (0, config_1.getConfig)();
    const [deployer] = await hardhat_1.ethers.getSigners();
    (0, logger_1.logger)("---> Upgrading strategies implementation for the pancakeswap workers... <---");
    const addToPoolWithBaseTokenStrategyProxyAddress = config.strategies.pancakeswap.AddToPoolWithBaseToken;
    if (!addToPoolWithBaseTokenStrategyProxyAddress) {
        throw new Error("Address for PancakeswapStrategyAddToPoolWithBaseToken not found");
    }
    const addToPoolWithoutBaseTokenStrategyProxyAddress = config.strategies.pancakeswap.AddToPoolWithoutBaseToken;
    if (!addToPoolWithoutBaseTokenStrategyProxyAddress) {
        throw new Error("Address for PancakeswapStrategyAddToPoolWithoutBaseToken not found");
    }
    const liquidateStrategyProxyAddress = config.strategies.pancakeswap.Liquidate;
    if (!liquidateStrategyProxyAddress) {
        throw new Error("Address for PancakeswapStrategyLiquidate not found");
    }
    const AddToPoolWithBaseTokenStrategyFactory = await hardhat_1.ethers.getContractFactory("PancakeswapStrategyAddToPoolWithBaseToken", deployer);
    const AddToPoolWithBaseTokenStrategy = await hardhat_1.upgrades.upgradeProxy(addToPoolWithBaseTokenStrategyProxyAddress, AddToPoolWithBaseTokenStrategyFactory);
    await AddToPoolWithBaseTokenStrategy.deployed();
    (0, logger_1.logger)(`- new implementation of AddToPoolWithBaseTokenStrategy deployed at ${AddToPoolWithBaseTokenStrategy.address}`);
    const AddToPoolWithoutBaseTokenStrategyFactory = await hardhat_1.ethers.getContractFactory("PancakeswapStrategyAddToPoolWithoutBaseToken", deployer);
    const AddToPoolWithoutBaseTokenStrategy = await hardhat_1.upgrades.upgradeProxy(addToPoolWithoutBaseTokenStrategyProxyAddress, AddToPoolWithoutBaseTokenStrategyFactory);
    await AddToPoolWithoutBaseTokenStrategy.deployed();
    (0, logger_1.logger)(`- new implementation of AddToPoolWithoutBaseTokenStrategy deployed at ${AddToPoolWithoutBaseTokenStrategy.address}`);
    const LiquidateStrategyFactory = await hardhat_1.ethers.getContractFactory("PancakeswapStrategyLiquidate", deployer);
    const LiquidateStrategy = await hardhat_1.upgrades.upgradeProxy(liquidateStrategyProxyAddress, LiquidateStrategyFactory);
    await LiquidateStrategy.deployed();
    (0, logger_1.logger)(`- new implementation of LiquidateStrategy deployed at ${LiquidateStrategy.address}`);
};
exports.default = upgradeFunc;
upgradeFunc.tags = ["PancakeswapStrategiesUpgrade"];
