import {
  MockToken,
  MockWBNB,
  Vault,
  VaultConfig,
  VaultConfig__factory,
  Vault__factory,
} from "../../typechain";
import { ethers, upgrades } from "hardhat";

import { Signer } from "@ethersproject/abstract-signer";
import { WrappedNativeTokenRelayer } from "../../typechain/WrappedNativeTokenRelayer";
import { WrappedNativeTokenRelayer__factory } from "../../typechain/factories/WrappedNativeTokenRelayer__factory";

export const deployVault = async (
  mockBNB: MockWBNB,
  baseToken: MockToken,
  protocolManagerAddress: string,
  bountyCollectorAddress: string,
  treasuryAccountAddress: string,
  deployer: Signer
): Promise<[Vault, VaultConfig, WrappedNativeTokenRelayer]> => {
  const WNativeRelayer = (await ethers.getContractFactory(
    "WrappedNativeTokenRelayer",
    deployer
  )) as WrappedNativeTokenRelayer__factory;
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

  const vault = (await upgrades.deployProxy(Vault, [
    vaultConfig.address,
    baseToken.address,
    protocolManagerAddress,
    bountyCollectorAddress,
  ])) as Vault;
  await vault.deployed();

  return [vault, vaultConfig, wNativeRelayer as WrappedNativeTokenRelayer];
};
