import {
  PancakeMasterChefV2,
  PancakeFactory,
  PancakeRouterV2,
  PancakeMasterChef,
  MockToken,
} from "../../typechain";

import { BigNumber } from "@ethersproject/bignumber";
import { CakeToken } from "../../typechain/CakeToken";
import { MockWBNB } from "../../typechain/MockWBNB";
import { Signer } from "@ethersproject/abstract-signer";
import { SyrupBar } from "../../typechain/SyrupBar";
import { deployContract } from "./deployContract";
import { ethers } from "hardhat";
import { deployToken } from "./deployToken";

interface IHolder {
  address: string;
  amount: BigNumber;
}

export const deployPancakeV2 = async (
  wbnb: MockWBNB,
  cakeHolders: IHolder[],
  deployer: Signer
): Promise<[PancakeFactory, PancakeRouterV2, CakeToken, SyrupBar, PancakeMasterChefV2]> => {
  const _feeToAddress = ethers.constants.AddressZero;

  const PancakeFactory = (await deployContract(
    "PancakeFactory",
    [_feeToAddress],
    deployer
  )) as PancakeFactory;

  const PancakeRouterV2 = (await deployContract(
    "PancakeRouterV2",
    [PancakeFactory.address, wbnb.address],
    deployer
  )) as PancakeRouterV2;

  const CakeToken = (await deployContract("CakeToken", [], deployer)) as CakeToken;

  // Deploy CAKE
  if (cakeHolders !== undefined) {
    cakeHolders.forEach(
      async (cakeHolder) =>
        await CakeToken["mint(address,uint256)"](cakeHolder.address, cakeHolder.amount)
    );
  }

  const SyrupBar = (await deployContract("SyrupBar", [CakeToken.address], deployer)) as SyrupBar;

  /// Setup MasterChef
  const PancakeMasterChef = (await deployContract(
    "PancakeMasterChef",
    [
      CakeToken.address,
      SyrupBar.address,
      await deployer.getAddress(),
      ethers.utils.parseEther("40"),
      0,
    ],
    deployer
  )) as PancakeMasterChef;

  const DummyToken = (await deployToken(
    {
      name: "DummyToken",
      symbol: "DT",
      holders: [{ address: await deployer.getAddress(), amount: ethers.utils.parseEther("10") }],
    },
    deployer
  )) as MockToken;

  // Transfer ownership so masterChef can mint CAKE
  await Promise.all([
    await CakeToken.transferOwnership(PancakeMasterChef.address),
    await SyrupBar.transferOwnership(PancakeMasterChef.address),
  ]);

  // await PancakeMasterChef.set(0, 0, true);
  await PancakeMasterChef.add(1, DummyToken.address, true);

  const PancakeMasterChefV2 = (await deployContract(
    "PancakeMasterChefV2",
    [PancakeMasterChef.address, CakeToken.address, 1, await deployer.getAddress()],
    deployer
  )) as PancakeMasterChefV2;

  await DummyToken.approve(PancakeMasterChefV2.address, ethers.utils.parseEther("10"));

  await PancakeMasterChefV2.init(DummyToken.address);

  return [PancakeFactory, PancakeRouterV2, CakeToken, SyrupBar, PancakeMasterChefV2];
};
