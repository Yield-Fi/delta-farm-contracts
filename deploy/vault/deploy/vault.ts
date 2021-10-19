import { VaultConfigType, getConfig } from "../../utils/config";
import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { logger } from "../../utils/logger";
import { ProtocolManager__factory } from "../../../typechain";

const deployFunc: DeployFunction = async () => {
  // The array of vaults' names to deploy.
  const vaultsToDeploy: VaultConfigType["name"][] = ["BUSD Vault"];

  const vaultsFilter = (vault: VaultConfigType) => vaultsToDeploy.includes(vault.name);

  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  const deployedVaults: string[] = [];

  logger("---> Deploying vaults... <---");
  for (const vault of config.vaults.filter(vaultsFilter)) {
    logger(`  -> ${vault.name}`);
    const VaultConfigFactory = await ethers.getContractFactory("VaultConfig", deployer);

    const VaultConfig = await upgrades.deployProxy(VaultConfigFactory, [
      config.tokens.WBNB,
      config.wrappedNativeTokenRelayer,
      config.adminContract,
    ]);

    await VaultConfig.deployed();

    logger(`  - Vault Config deployed at ${VaultConfig.address}`);

    const VaultFactory = await ethers.getContractFactory("Vault", deployer);

    const Vault = await upgrades.deployProxy(VaultFactory, [
      VaultConfig.address,
      vault.baseToken,
      config.protocolManager,
      config.feeCollector,
    ]);

    await Vault.deployed();

    deployedVaults.push(Vault.address);

    logger(`  - Vault deployed at ${Vault.address}`);
  }

  const ProtocolManager = ProtocolManager__factory.connect(config.protocolManager, deployer);

  await ProtocolManager.approveVaults(deployedVaults, true);
};

export default deployFunc;
deployFunc.tags = ["Vault"];
