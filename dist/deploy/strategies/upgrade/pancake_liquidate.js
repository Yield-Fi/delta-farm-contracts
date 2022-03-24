"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const upgradeFunc = async () => {
    const config = (0, config_1.getConfig)();
    const [deployer] = await hardhat_1.ethers.getSigners();
    (0, logger_1.logger)("---> Upgrading liquidate strategy implementation for the pancakeswap workers... <---");
    const liquidateStrategyProxyAddress = config.strategies.pancakeswap.Liquidate;
    if (!liquidateStrategyProxyAddress) {
        throw new Error("Address for PancakeswapStrategyLiquidate not found");
    }
    const LiquidateStrategyFactory = await hardhat_1.ethers.getContractFactory("PancakeswapStrategyLiquidate", deployer);
    const LiquidateStrategy = await hardhat_1.upgrades.upgradeProxy(liquidateStrategyProxyAddress, LiquidateStrategyFactory);
    await LiquidateStrategy.deployed();
    (0, logger_1.logger)(`- new implementation of LiquidateStrategy deployed at ${LiquidateStrategy.address}`);
};
exports.default = upgradeFunc;
upgradeFunc.tags = ["PancakeswapLiquidateStrategyUpgrade"];
