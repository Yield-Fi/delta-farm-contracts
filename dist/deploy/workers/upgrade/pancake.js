"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const upgradeFunc = async () => {
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    (0, logger_1.logger)("--> Upgrading implementation of pancakeswap workers... <--");
    for (const vault of config.vaults) {
        (0, logger_1.logger)(`  -> Workers for ${vault.name}`);
        for (const worker of vault.workers) {
            (0, logger_1.logger)(`  -> Upgrading ${worker.name}...`);
            const PancakeswapWorkerFactory = await hardhat_1.ethers.getContractFactory("PancakeswapWorker", deployer);
            const PancakeswapWorker = (await hardhat_1.upgrades.upgradeProxy(worker.address, PancakeswapWorkerFactory));
            await PancakeswapWorker.deployed();
            (0, logger_1.logger)(`  New implementation of ${worker.name} deployed at ${PancakeswapWorker.address}`);
        }
    }
};
exports.default = upgradeFunc;
upgradeFunc.tags = ["PancakeswapWorkersUpgrade"];
