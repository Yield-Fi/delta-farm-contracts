"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const deployFunc = async () => {
    const config = (0, config_1.getConfig)();
    const [deployer] = await hardhat_1.ethers.getSigners();
    (0, logger_1.logger)("---> Upgrading implementation of fee collector... <---");
    const feeCollectorAddress = config.feeCollector;
    if (!feeCollectorAddress) {
        throw new Error("Address for FeeCollector not found");
    }
    const FeeCollectorFactory = await hardhat_1.ethers.getContractFactory("FeeCollector", deployer);
    const FeeCollector = await hardhat_1.upgrades.upgradeProxy(feeCollectorAddress, FeeCollectorFactory);
    await FeeCollector.deployed();
    (0, logger_1.logger)(`- New implementation of FeeCollector deployed at ${FeeCollector.address}`);
};
exports.default = deployFunc;
deployFunc.tags = ["FeeCollectorUpgrade"];
