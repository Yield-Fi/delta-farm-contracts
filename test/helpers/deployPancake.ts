import { Signer } from "@ethersproject/abstract-signer";
import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "hardhat";
import { PancakeFactory, PancakeRouterV2 } from "../../typechain";
import { CakeToken } from "../../typechain/CakeToken";
import { MockWBNB } from "../../typechain/MockWBNB";
import { PancakeMasterChef } from "../../typechain/PancakeMasterChef";
import { SyrupBar } from "../../typechain/SyrupBar";
import { deployContract } from "./deployContract";

interface IHolder {
  address: string;
  amount: BigNumber;
}

export const deployPancakeV2 = async (
  wbnb: MockWBNB,
  cakePerBlock: BigNumber,
  cakeHolders: IHolder[],
  deployer: Signer
): Promise<[PancakeFactory, PancakeRouterV2, CakeToken, SyrupBar, PancakeMasterChef]> => {
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
    [CakeToken.address, SyrupBar.address, await deployer.getAddress(), cakePerBlock, 0],
    deployer
  )) as PancakeMasterChef;

  // Transfer ownership so masterChef can mint CAKE
  await Promise.all([
    await CakeToken.transferOwnership(PancakeMasterChef.address),
    await SyrupBar.transferOwnership(PancakeMasterChef.address),
  ]);

  return [PancakeFactory, PancakeRouterV2, CakeToken, SyrupBar, PancakeMasterChef];
};
