import { Signer } from "@ethersproject/abstract-signer";
import { ethers, upgrades } from "hardhat";

export const deployProxyContract = async (
  contract: string,
  params: Array<any>,
  deployer: Signer
) => {
  const ContractFactory = await ethers.getContractFactory(contract, deployer);

  const Contract = await upgrades.deployProxy(ContractFactory, params);

  await Contract.deployed();
  return Contract;
};

export const deployContract = async (contract: string, params: Array<any>, deployer: Signer) => {
  const ContractFactory = await ethers.getContractFactory(contract, deployer);

  const Contract = await ContractFactory.deploy(...params);

  await Contract.deployed();
  return Contract;
};
