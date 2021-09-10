import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import TestnetConfig from "../../../.testnet.json";
import { Vault__factory } from "../../../typechain";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const TARGETED_VAULTS = ["defiBUSD"];

  const config = TestnetConfig;

  const toBeUpgradedVaults = TARGETED_VAULTS.map((tv) => {
    const vault = config.Vaults.find((v) => tv == v.symbol);
    if (vault === undefined) {
      throw `error: not found vault with ${tv} symbol`;
    }
    if (vault.config === "") {
      throw `error: not found config address`;
    }

    return vault;
  });

  for (const vault of toBeUpgradedVaults) {
    console.log(`============`);
    console.log(
      `>> Upgrading Vault at ${vault.symbol} through direct contract call as owner.`
    );
    console.log(">> Upgrade & deploy if needed a new IMPL automatically.");
    const NewVaultFactory = (await ethers.getContractFactory(
      "Vault"
    )) as Vault__factory;

    const _vault = await upgrades.upgradeProxy(vault.address, NewVaultFactory);

    console.log(`>> Implementation address: ${_vault.address}`);
    console.log("✅ Done");
  }
};

export default func;
func.tags = ["VaultUpgrade"];
