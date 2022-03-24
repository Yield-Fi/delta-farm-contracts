"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../utils/config");
const hardhat_1 = require("hardhat");
const logger_1 = require("../../utils/logger");
const typechain_1 = require("../../../typechain");
const deployFunc = async () => {
    // The array of vaults' names to deploy.
    const vaultsToDeploy = ["BUSD Vault"];
    const vaultsFilter = (vault) => vaultsToDeploy.includes(vault.name);
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    const deployedVaults = [];
    (0, logger_1.logger)("---> Deploying vaults... <---");
    for (const vault of config.vaults.filter(vaultsFilter)) {
        (0, logger_1.logger)(`  -> ${vault.name}`);
        const VaultConfigFactory = await hardhat_1.ethers.getContractFactory("VaultConfig", deployer);
        const VaultConfig = await hardhat_1.upgrades.deployProxy(VaultConfigFactory, [
            config.tokens.WBNB,
            config.wrappedNativeTokenRelayer,
            config.adminContract,
        ]);
        await VaultConfig.deployed();
        (0, logger_1.logger)(`  - Vault Config deployed at ${VaultConfig.address}`);
        const VaultFactory = await hardhat_1.ethers.getContractFactory("Vault", deployer);
        const Vault = await hardhat_1.upgrades.deployProxy(VaultFactory, [
            VaultConfig.address,
            vault.baseToken,
            config.protocolManager,
            config.feeCollector,
        ]);
        await Vault.deployed();
        deployedVaults.push(Vault.address);
        (0, logger_1.logger)(`  - Vault deployed at ${Vault.address}`);
    }
    const ProtocolManager = typechain_1.ProtocolManager__factory.connect(config.protocolManager, deployer);
    await ProtocolManager.approveVaults(deployedVaults, true);
};
exports.default = deployFunc;
deployFunc.tags = ["Vault"];
