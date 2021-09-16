import {
  MockToken,
  MockWBNB,
  Vault,
  VaultConfig,
  VaultConfig__factory,
  Vault__factory,
  WNativeRelayer,
  WNativeRelayer__factory,
} from "../../typechain";
import { ethers, upgrades } from "hardhat";

import { Signer } from "@ethersproject/abstract-signer";

export const deployVault = async (
  mockBNB: MockWBNB,
  treasuryAccountAddress: string,
  baseToken: MockToken,
  deployer: Signer
): Promise<[Vault, WNativeRelayer]> => {
  const WNativeRelayer = (await ethers.getContractFactory(
    "WNativeRelayer",
    deployer
  )) as WNativeRelayer__factory;
  const wNativeRelayer = await upgrades.deployProxy(WNativeRelayer, [mockBNB.address]);
  await wNativeRelayer.deployed();

  const VaultConfig = (await ethers.getContractFactory(
    "VaultConfig",
    deployer
  )) as VaultConfig__factory;
  const vaultConfig = (await upgrades.deployProxy(VaultConfig, [
    mockBNB.address,
    wNativeRelayer.address,
    treasuryAccountAddress,
  ])) as VaultConfig;
  await vaultConfig.deployed();

  const Vault = (await ethers.getContractFactory("Vault", deployer)) as Vault__factory;
  const baseTokenSymbol = await baseToken.symbol();
  const vault = (await upgrades.deployProxy(Vault, [
    vaultConfig.address,
    baseToken.address,
    `Deficentral ${baseTokenSymbol}}`,
    `defin${baseTokenSymbol}`,
  ])) as Vault;
  await vault.deployed();

  // TODO: Contract restrictions
  // await wNativeRelayer.setCallerOk([vault.address], true);

  return [vault, wNativeRelayer as WNativeRelayer];
};
