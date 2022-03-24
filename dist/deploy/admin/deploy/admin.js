"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const typechain_1 = require("../../../typechain");
const logger_1 = require("../../utils/logger");
const config_1 = require("../../utils/config");
const deployFunc = async () => {
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    (0, logger_1.logger)("---> Deploying Admin contract... <---");
    const AdminFactory = await hardhat_1.ethers.getContractFactory("Admin", deployer);
    const Admin = (await hardhat_1.upgrades.deployProxy(AdminFactory, [
        config.protocolManager,
        config.feeCollector,
    ]));
    await Admin.deployed();
    const ProtocolManager = typechain_1.ProtocolManager__factory.connect(config.protocolManager, deployer);
    await ProtocolManager.approveAdminContract(Admin.address);
    (0, logger_1.logger)(`- Admin contract deployed at ${Admin.address}`);
};
exports.default = deployFunc;
deployFunc.tags = ["Admin"];
