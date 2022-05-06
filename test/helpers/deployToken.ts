import { MockToken, MockWBNB, MockWBNB__factory } from "../../typechain";
import { ethers, upgrades } from "hardhat";

import { BigNumber } from "@ethersproject/bignumber";
import { Signer } from "@ethersproject/abstract-signer";

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

  return Promise.all(promises);
};

export const deployToken = async (token: IMockTokenConfig, deployer: Signer) => {
  const MockTokenFactory = await ethers.getContractFactory("MockToken", deployer);
  const MockToken = await MockTokenFactory.deploy(token.name, token.symbol);

  if (token.holders !== undefined) {
    token.holders.forEach(async (holder) => await MockToken.mint(holder.address, holder.amount));
  }

  return MockToken;
};

export const deployWBNB = async (deployer: Signer): Promise<MockWBNB> => {
  const WBNB = (await ethers.getContractFactory("MockWBNB", deployer)) as MockWBNB__factory;
  const wbnb = await WBNB.deploy();
  await wbnb.deployed();
  return wbnb;
};
