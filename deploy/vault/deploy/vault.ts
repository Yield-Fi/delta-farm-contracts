import {
  Vault,
  Vault__factory,
  WNativeRelayer,
  WNativeRelayer__factory,
} from "../../../typechain";
import { ethers, upgrades } from "hardhat";

import { ConfigEntity } from "../../entities/config";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const VAULT_NAME = "defiBUSD VAULT";
  const NAME = "deficentral BUSD";
  const SYMBOL = "defiBUSD";
  const config = ConfigEntity.getConfig();
  const targetedVault = config.Vaults.find(
    (v: { symbol: string }) => v.symbol === SYMBOL
  );
  if (targetedVault === undefined) {
    throw `error: not found any vault with ${SYMBOL} symbol`;
  }
  if (targetedVault.config === "") {
    throw `error: not config address`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokenList: any = config.Tokens;
  const baseTokenAddr = tokenList[SYMBOL.replace("defi", "")];
  if (baseTokenAddr === undefined) {
    throw `error: not found ${SYMBOL.replace("defi", "")} in tokenList`;
  }

  console.log(`>> Deploying an upgradable Vault contract for ${VAULT_NAME}`);
  const Vault = (await ethers.getContractFactory(
    "Vault",
    (
      await ethers.getSigners()
    )[0]
  )) as Vault__factory;
  const vault = (await upgrades.deployProxy(Vault, [
    targetedVault.config,
    baseTokenAddr,
    NAME,
    SYMBOL,
  ])) as Vault;
  await vault.deployed();
  console.log(`>> Deployed at ${vault.address}`);

  console.log(`>> Transferring ownership of Vault to Proxy Admin`);
  await vault.transferOwnership(config.ProxyAdmin);
  console.log("✅ Done");

  const wNativeRelayer = WNativeRelayer__factory.connect(
    config.SharedConfig.WNativeRelayer,
    (await ethers.getSigners())[0]
  ) as WNativeRelayer;

  console.log(">> Whitelisting Vault on WNativeRelayer Contract");
  await wNativeRelayer.setCallerOk([vault.address], true);
  console.log("✅ Done");
};

export default func;
func.tags = ["Vault"];
