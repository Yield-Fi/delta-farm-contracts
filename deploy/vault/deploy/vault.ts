import { VaultConfigType, getConfig } from "../../utils/config";
import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  // The array of vaults' names to deploy.
  const vaultsToDeploy: VaultConfigType["name"][] = ["BUSD Vault"];

  const vaultsFilter = (vault: VaultConfigType) => vaultsToDeploy.includes(vault.name);

  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  logger("---> Deploying vaults... <---");
  for (const vault of config.vaults.filter(vaultsFilter)) {
    logger(`  -> ${vault.name}`);
    const VaultConfigFactory = await ethers.getContractFactory("VaultConfig", deployer);

    const VaultConfig = await upgrades.deployProxy(VaultConfigFactory, [
      config.tokens.WBNB,
      config.wrappedNativeTokenRelayer,
      config.treasuryAccount,
    ]);

    await VaultConfig.deployed();

    logger(`  - Vault Config deployed at ${VaultConfig.address}`);

    const VaultFactory = await ethers.getContractFactory("Vault", deployer);

    const Vault = await upgrades.deployProxy(VaultFactory, [
      VaultConfig.address,
      vault.baseToken,
      config.protocolManager,
      config.bountyCollector,
    ]);

    await Vault.deployed();

    logger(`  - Vault deployed at ${Vault.address}`);
  }
};

export default deployFunc;
deployFunc.tags = ["Vault"];
