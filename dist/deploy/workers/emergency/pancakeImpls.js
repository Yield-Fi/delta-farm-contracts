"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const ProxyAdmin__factory_1 = require("../../../typechain/factories/ProxyAdmin__factory");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
const MANUAL_IMPLEMENTATION_ADDRESS = "0xf281481977129002Aa0348F64fa649077cF5D983";
const PROXY_ADMIN_ADDRESS = "0x84a4e5606E54ccf25c9832Ae7Eb0d36F03cA6368";
const workersToReassignment = ["CAKE-WBNB Farm", "WBNB-BUSD Farm", "DAI-BUSD Farm"];
/**
 * MANUAL PROXY REASSIGNMENT
 * Date of issue: 05.02.2022
 * Date of resolve: 08.02.2022
 * Date of call: 08.02.2022
 * Description: OZ upgrades due the bsc provider error saved invalid proxy implementation address for three of all workers resulting in contract unupgradeability
 * Solution: Find the correct implementation address, pass it to the reassignment and perform manual reset
 * Disclaimer: Check the manifest file after issuing given script
 */
const upgradeFunc = async () => {
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    (0, logger_1.logger)("--> Setting manual implementation for pancakeswap workers... <--");
    for (const vault of config.vaults) {
        for (const worker of vault.workers.filter((w) => workersToReassignment.includes(w.name))) {
            (0, logger_1.logger)(`  -> Setting manual implementation address for ${worker.name}...`);
            try {
                const oldImplementationAddress = await hardhat_1.upgrades.erc1967.getImplementationAddress(worker.address);
                const proxy = ProxyAdmin__factory_1.ProxyAdmin__factory.connect(PROXY_ADMIN_ADDRESS, deployer);
                await proxy.upgrade(worker.address, MANUAL_IMPLEMENTATION_ADDRESS);
                const newImplementationAddress = await hardhat_1.upgrades.erc1967.getImplementationAddress(worker.address);
                (0, logger_1.logger)(`  New implementation of ${worker.name} has been change manually from ${oldImplementationAddress} to ${newImplementationAddress}`);
                (0, logger_1.logger)(`  Success?: ${newImplementationAddress.toLowerCase() === MANUAL_IMPLEMENTATION_ADDRESS.toLowerCase()}`);
            }
            catch (e) {
                console.log(e);
            }
        }
    }
    (0, logger_1.logger)("--> Upgrading implementation of pancakeswap workers after manual reimplementation... <--");
    for (const vault of config.vaults) {
        (0, logger_1.logger)(`  -> Workers for ${vault.name}`);
        for (const worker of vault.workers) {
            (0, logger_1.logger)(`  -> Upgrading ${worker.name}...`);
            try {
                const PancakeswapWorkerFactory = await hardhat_1.ethers.getContractFactory("PancakeswapWorker", deployer);
                const PancakeswapWorker = (await hardhat_1.upgrades.upgradeProxy(worker.address, PancakeswapWorkerFactory));
                await PancakeswapWorker.deployed();
                (0, logger_1.logger)(`  New implementation of ${worker.name} deployed at ${PancakeswapWorker.address}`);
            }
            catch (e) {
                console.error(e);
            }
        }
    }
};
exports.default = upgradeFunc;
upgradeFunc.tags = ["PancakeManualImplementations"];
