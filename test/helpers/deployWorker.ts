import { BigNumberish, Signer } from "ethers";
import {
  MockToken,
  PancakeMasterChef,
  PancakeRouterV2,
  PancakeswapWorker,
  PancakeswapWorker__factory,
  Vault,
} from "../../typechain";
import { ethers, upgrades } from "hardhat";

import { PancakeswapStrategyAddBaseTokenOnly } from "../../typechain/PancakeswapStrategyAddBaseTokenOnly";

export const deployPancakeWorker = async (
  vault: Vault,
  baseToken: MockToken,
  masterChef: PancakeMasterChef,
  router: PancakeRouterV2,
  poolId: number,
  reinvestStrategy: PancakeswapStrategyAddBaseTokenOnly,
  reinvestPath: string[],
  reinvestThreshold: BigNumberish,
  bountyCollector: string,
  treasuryFeeBps: BigNumberish,
  rewardToFeePat: string[],
  deployer: Signer
): Promise<PancakeswapWorker> => {
  const PancakeswapWorker = (await ethers.getContractFactory(
    "PancakeswapWorker",
    deployer
  )) as PancakeswapWorker__factory;
  const pancakeswapWorker = (await upgrades.deployProxy(PancakeswapWorker, [
    vault.address,
    baseToken.address,
    masterChef.address,
    router.address,
    poolId,
    reinvestStrategy.address,
    reinvestPath,
    reinvestThreshold,
    bountyCollector,
    treasuryFeeBps,
    rewardToFeePat,
  ])) as PancakeswapWorker;

  await pancakeswapWorker.deployed();

  return pancakeswapWorker;
};
