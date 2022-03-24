"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const deployFunc = async () => {
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    (0, logger_1.logger)("---> Deploying ProtocolManager... <---");
    const ProtocolManagerFactory = await hardhat_1.ethers.getContractFactory("ProtocolManager", deployer);
    const ProtocolManager = (await hardhat_1.upgrades.deployProxy(ProtocolManagerFactory, [
        config.protocolOperators,
    ]));
    await ProtocolManager.deployed();
    (0, logger_1.logger)(`- ProtocolManager deployed at ${ProtocolManager.address}`);
};
exports.default = deployFunc;
deployFunc.tags = ["ProtocolManager"];
