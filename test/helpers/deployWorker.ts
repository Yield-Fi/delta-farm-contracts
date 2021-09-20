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
import { PancakeswapStrategyLiquidate } from "../../typechain/PancakeswapStrategyLiquidate";

export const deployPancakeWorker = async (
  vault: Vault,
  baseToken: MockToken,
  masterChef: PancakeMasterChef,
  router: PancakeRouterV2,
  poolId: number,
  addStrat: PancakeswapStrategyAddBaseTokenOnly,
  liqStrat: PancakeswapStrategyLiquidate,
  reinvestBountyBps: BigNumberish,
  treasuryAddress: string,
  reinvestPath: string[],
  reinvestThreshold: BigNumberish,
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
    addStrat.address,
    liqStrat.address,
    reinvestBountyBps,
    treasuryAddress,
    reinvestPath,
    reinvestThreshold,
  ])) as PancakeswapWorker;

  await pancakeswapWorker.deployed();

  return pancakeswapWorker;
};
