import {
  MockToken,
  MockWBNB,
  SpookySwapMasterChef,
  SpookySwapMasterChefV2,
  SpookyToken,
  UniswapV2Factory,
  UniswapV2Router02,
} from "../../typechain";

import { BigNumber } from "@ethersproject/bignumber";
import { Signer } from "@ethersproject/abstract-signer";
import { deployContract } from "./deployContract";
import { ethers } from "hardhat";
import { deployToken } from "./deployToken";

interface IHolder {
  address: string;
  amount: BigNumber;
}

export const deploySpookySwap = async (
  wbnb: MockWBNB,
  booPerSecond: BigNumber,
  booHolders: IHolder[],
  deployer: Signer
): Promise<
  [UniswapV2Factory, UniswapV2Router02, SpookyToken, SpookySwapMasterChef, SpookySwapMasterChefV2]
> => {
  const _feeToAddress = ethers.constants.AddressZero;

  const UniswapV2Factory = (await deployContract(
    "UniswapV2Factory",
    [_feeToAddress],
    deployer
  )) as UniswapV2Factory;

  const UniswapV2Router02 = (await deployContract(
    "PancakeRouterV2",
    [UniswapV2Factory.address, wbnb.address],
    deployer
  )) as UniswapV2Router02;

  const SpookyToken = (await deployContract("SpookyToken", [], deployer)) as SpookyToken;
  const DummyToken = (await deployToken(
    {
      name: "DummyToken",
      symbol: "DT",
      holders: [{ address: await deployer.getAddress(), amount: ethers.utils.parseEther("10") }],
    },
    deployer
  )) as MockToken;

  // Deploy CAKE
  if (booHolders !== undefined) {
    booHolders.forEach(
      async (booHolder) => await SpookyToken.mint(booHolder.address, booHolder.amount)
    );
  }

  /// Setup MasterChef
  const SpookySwapMasterChef = (await deployContract(
    "SpookySwapMasterChef",
    [SpookyToken.address, await deployer.getAddress(), booPerSecond, 0],
    deployer
  )) as SpookySwapMasterChef;

  // Transfer ownership so masterChef can mint CAKE
  await Promise.all([await SpookyToken.transferOwnership(SpookySwapMasterChef.address)]);

  await SpookySwapMasterChef.add(1, DummyToken.address);

  const SpookySwapMasterChefV2 = (await deployContract(
    "SpookySwapMasterChefV2",
    [SpookySwapMasterChef.address, SpookyToken.address, 0],
    deployer
  )) as SpookySwapMasterChefV2;

  await DummyToken.approve(SpookySwapMasterChefV2.address, ethers.utils.parseEther("10"));

  await SpookySwapMasterChefV2.init(DummyToken.address);

  return [
    UniswapV2Factory,
    UniswapV2Router02,
    SpookyToken,
    SpookySwapMasterChef,
    SpookySwapMasterChefV2,
  ];
};
