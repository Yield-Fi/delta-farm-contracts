"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const deployFunc = async () => {
    const config = (0, config_1.getConfig)();
    const [deployer] = await hardhat_1.ethers.getSigners();
    (0, logger_1.logger)("---> Upgrading Admin contract implementation... <---");
    const AdminFactory = await hardhat_1.ethers.getContractFactory("Admin", deployer);
    const Admin = (await hardhat_1.upgrades.upgradeProxy(config.adminContract, AdminFactory));
    await Admin.deployed();
    (0, logger_1.logger)(`- Implementation of Admin contract deployed at ${Admin.address}`);
};
exports.default = deployFunc;
deployFunc.tags = ["AdminUpgrade"];
