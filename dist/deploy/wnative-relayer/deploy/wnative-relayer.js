"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const deployFun = async function () {
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    (0, logger_1.logger)("---> Deploying WrappedNativeTokenRelayer... <---");
    const WrappedNativeTokenRelayerFactory = await hardhat_1.ethers.getContractFactory("WrappedNativeTokenRelayer", deployer);
    const WrappedNativeTokenRelayer = await hardhat_1.upgrades.deployProxy(WrappedNativeTokenRelayerFactory, [
        config.tokens.WBNB,
    ]);
    await WrappedNativeTokenRelayer.deployed();
    (0, logger_1.logger)(`- WrappedNativeTokenRelayer deployed at ${WrappedNativeTokenRelayer.address}`);
};
exports.default = deployFun;
deployFun.tags = ["WrappedNativeTokenRelayer"];
