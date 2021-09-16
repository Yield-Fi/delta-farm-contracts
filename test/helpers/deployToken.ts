import { Signer } from "@ethersproject/abstract-signer";
import { BigNumber } from "@ethersproject/bignumber";
import { ethers, upgrades } from "hardhat";
import { MockToken } from "../../typechain";

export interface IHolder {
  address: string;
  amount: BigNumber;
}

export interface IMockTokenConfig {
  name: string;
  symbol: string;
  holders?: Array<IHolder>;
}

export const deployTokens = async (tokens: IMockTokenConfig[], deployer: Signer) => {
  const promises = [];
  for (const token of tokens) {
    promises.push(deployToken(token, deployer));
  }

  return promises;
};

export const deployToken = async (token: IMockTokenConfig, deployer: Signer) => {
  const MockTokenFactory = await ethers.getContractFactory("MockToken", deployer);
  const MockToken = (await upgrades.deployProxy(MockTokenFactory, [
    token.name,
    token.symbol,
  ])) as MockToken;
  await MockToken.deployed();

  if (token.holders !== undefined) {
    token.holders.forEach(async (holder) => await MockToken.mint(holder.address, holder.amount));
  }

  return MockToken;
};
