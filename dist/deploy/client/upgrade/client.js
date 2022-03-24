"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const upgradeFunc = async () => {
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    (0, logger_1.logger)("--> Upgrading implementation of client contracts... <--");
    for (const client of config.clients) {
        (0, logger_1.logger)(`  -> Upgrading contract of ${client.name}...`);
        const ClientFactory = await hardhat_1.ethers.getContractFactory("Client", deployer);
        console.log(client.address);
        const Client = (await hardhat_1.upgrades.upgradeProxy(client.address, ClientFactory));
        await Client.deployed();
        (0, logger_1.logger)(`  New implementation of contract of ${client.name} deployed at ${Client.address}`);
    }
};
exports.default = upgradeFunc;
upgradeFunc.tags = ["ClientUpgrade"];
