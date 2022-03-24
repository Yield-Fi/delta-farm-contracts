"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const deployFunc = async () => {
    const config = (0, config_1.getConfig)();
    const [deployer] = await hardhat_1.ethers.getSigners();
    (0, logger_1.logger)("---> Deploying fee collector... <---");
    const FeeCollectorFactory = await hardhat_1.ethers.getContractFactory("FeeCollector", deployer);
    const FeeCollector = await hardhat_1.upgrades.deployProxy(FeeCollectorFactory, [
        config.baseToken,
        config.feeThreshold,
        config.protocolManager,
    ]);
    await FeeCollector.deployed();
    (0, logger_1.logger)(`- FeeCollector deployed at ${FeeCollector.address}`);
};
exports.default = deployFunc;
deployFunc.tags = ["FeeCollector"];
