import {
  PancakeRouterV2,
  PancakeswapStrategyAddBaseTokenOnly,
  PancakeswapStrategyAddBaseTokenOnly__factory,
  PancakeswapStrategyLiquidate,
  PancakeswapStrategyLiquidate__factory,
} from "../../typechain";
import { ethers, upgrades } from "hardhat";

import { Signer } from "ethers";

export const deployPancakeStrategies = async (
  router: PancakeRouterV2,
  deployer: Signer
): Promise<[PancakeswapStrategyAddBaseTokenOnly, PancakeswapStrategyLiquidate]> => {
  /// Setup strategy
  const PancakeswapStrategyAddBaseTokenOnly = (await ethers.getContractFactory(
    "PancakeswapStrategyAddBaseTokenOnly",
    deployer
  )) as PancakeswapStrategyAddBaseTokenOnly__factory;
  const addStrat = (await upgrades.deployProxy(PancakeswapStrategyAddBaseTokenOnly, [
    router.address,
  ])) as PancakeswapStrategyAddBaseTokenOnly;
  await addStrat.deployed();

  const PancakeswapStrategyLiquidate = (await ethers.getContractFactory(
    "PancakeswapStrategyLiquidate",
    deployer
  )) as PancakeswapStrategyLiquidate__factory;
  const liqStrat = (await upgrades.deployProxy(PancakeswapStrategyLiquidate, [
    router.address,
  ])) as PancakeswapStrategyLiquidate;
  await liqStrat.deployed();

  return [addStrat, liqStrat];
};
