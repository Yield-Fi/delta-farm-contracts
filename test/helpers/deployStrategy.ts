import { Signer } from "@ethersproject/abstract-signer";
import { deployProxyContract } from ".";
import {
  PancakeRouterV2,
  PancakeswapStrategyAddBaseTokenOnly,
  PancakeswapStrategyLiquidate,
} from "../../typechain";

export const deployPancakeswapStrategies = async (
  router: PancakeRouterV2,
  deployer: Signer
): Promise<[PancakeswapStrategyAddBaseTokenOnly, PancakeswapStrategyLiquidate]> => {
  const AddBaseTokenOnly = (await deployProxyContract(
    "PancakeswapStrategyAddBaseTokenOnly",
    [router.address],
    deployer
  )) as PancakeswapStrategyAddBaseTokenOnly;

  const Liquidate = (await deployProxyContract(
    "PancakeswapStrategyLiquidate",
    [router.address],
    deployer
  )) as PancakeswapStrategyLiquidate;

  return [AddBaseTokenOnly, Liquidate];
};
