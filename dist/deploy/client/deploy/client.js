"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const typechain_1 = require("../../../typechain");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const deployFun = async function () {
    // The array of client's names to deploy.
    const clientsToDeploy = ["Client A"];
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    const clientFilter = (client) => clientsToDeploy.includes(client.name);
    (0, logger_1.logger)("---> Deploying Client contracts... <---");
    for (const client of config.clients.filter(clientFilter)) {
        (0, logger_1.logger)(`  -> Contract of ${client.name}`);
        const ClientFactory = await hardhat_1.ethers.getContractFactory("Client", deployer);
        const Client = (await hardhat_1.upgrades.deployProxy(ClientFactory, [
            client.kind,
            client.name,
            config.protocolManager,
            config.feeCollector,
            client.operators,
            client.additionalWithdrawers,
        ]));
        await Client.deployed();
        const ProtocolManager = typechain_1.ProtocolManager__factory.connect(config.protocolManager, deployer);
        await ProtocolManager.approveClients([Client.address], true);
        (0, logger_1.logger)(`  - Contract of ${client.name} deployed at ${Client.address}`);
    }
};
exports.default = deployFun;
deployFun.tags = ["Client"];
