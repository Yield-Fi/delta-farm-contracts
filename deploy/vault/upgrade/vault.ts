import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { getConfig, VaultConfigType } from "../../utils/config";
import { logger } from "../../utils/logger";

const upgradeFunc: DeployFunction = async () => {
  // The array of vaults' names to upgrade. To upgrade all vaults pass an empty array.
  const vaultsToDeploy: VaultConfigType["name"][] = [];

  const vaultsFilter = (vault: VaultConfigType) =>
    vaultsToDeploy.includes(vault.name) || vaultsToDeploy.length === 0;

  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  logger("---> Upgrading implementation of vaults... <---");
  for (const vault of config.vaults.filter(vaultsFilter)) {
    logger(`-> ${vault.name}`);
    const VaultConfigFactory = await ethers.getContractFactory(
      "VaultConfig",
      deployer
    );

    const VaultConfig = await upgrades.upgradeProxy(
      vault.config,
      VaultConfigFactory
    );

    await VaultConfig.deployed();

    logger(
      `  - New implementation of Vault Config deployed at ${VaultConfig.address}`
    );

    const VaultFactory = await ethers.getContractFactory("Vault", deployer);

    const Vault = await upgrades.upgradeProxy(vault.address, VaultFactory);

    await Vault.deployed();

    logger(`  - New implementation of Vault deployed at ${Vault.address}`);
  }
};

export default upgradeFunc;
upgradeFunc.tags = ["VaultUpgrade"];
