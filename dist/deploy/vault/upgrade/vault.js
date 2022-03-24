"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../utils/config");
const hardhat_1 = require("hardhat");
const logger_1 = require("../../utils/logger");
const upgradeFunc = async () => {
    // The array of vaults' names to upgrade. To upgrade all vaults pass an empty array.
    const vaultsToDeploy = [];
    const vaultsFilter = (vault) => vaultsToDeploy.includes(vault.name) || vaultsToDeploy.length === 0;
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    (0, logger_1.logger)("---> Upgrading implementation of vaults... <---");
    for (const vault of config.vaults.filter(vaultsFilter)) {
        (0, logger_1.logger)(`-> ${vault.name}`);
        const VaultConfigFactory = await hardhat_1.ethers.getContractFactory("VaultConfig", deployer);
        const VaultConfig = await hardhat_1.upgrades.upgradeProxy(vault.config, VaultConfigFactory);
        await VaultConfig.deployed();
        (0, logger_1.logger)(`  - New implementation of Vault Config deployed at ${VaultConfig.address}`);
        const VaultFactory = await hardhat_1.ethers.getContractFactory("Vault", deployer);
        const Vault = await hardhat_1.upgrades.upgradeProxy(vault.address, VaultFactory);
        await Vault.deployed();
        (0, logger_1.logger)(`  - New implementation of Vault deployed at ${Vault.address}`);
    }
};
exports.default = upgradeFunc;
upgradeFunc.tags = ["VaultUpgrade"];
