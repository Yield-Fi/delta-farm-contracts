import {
  PancakeERC20,
  PancakeRouterV2,
  PancakeswapStrategyAddToPoolWithBaseToken,
  PancakeswapStrategyAddToPoolWithBaseToken__factory,
  PancakeswapStrategyAddToPoolWithoutBaseToken,
  PancakeswapStrategyAddToPoolWithoutBaseToken__factory,
  PancakeswapStrategyLiquidate,
  PancakeswapStrategyLiquidate__factory,
  ProtocolManager,
} from "../../typechain";
import { ethers, upgrades } from "hardhat";

import { Signer } from "ethers";

export const deployPancakeStrategies = async (
  router: PancakeRouterV2,
  deployer: Signer,
  protocolManager: ProtocolManager
): Promise<
  [
    PancakeswapStrategyAddToPoolWithBaseToken,
    PancakeswapStrategyAddToPoolWithoutBaseToken,
    PancakeswapStrategyLiquidate
  ]
> => {
  /// Setup strategy
  const PancakeswapStrategyAddToPoolWithBaseTokenFactory = (await ethers.getContractFactory(
    "PancakeswapStrategyAddToPoolWithBaseToken",
    deployer
  )) as PancakeswapStrategyAddToPoolWithBaseToken__factory;
  const PancakeswapStrategyAddToPoolWithBaseToken = (await upgrades.deployProxy(
    PancakeswapStrategyAddToPoolWithBaseTokenFactory,
    [router.address, protocolManager.address]
  )) as PancakeswapStrategyAddToPoolWithBaseToken;
  await PancakeswapStrategyAddToPoolWithBaseToken.deployed();

  const PancakeswapStrategyAddToPoolWithoutBaseTokenFactory = (await ethers.getContractFactory(
    "PancakeswapStrategyAddToPoolWithoutBaseToken",
    deployer
  )) as PancakeswapStrategyAddToPoolWithoutBaseToken__factory;
  const PancakeswapStrategyAddToPoolWithoutBaseToken = (await upgrades.deployProxy(
    PancakeswapStrategyAddToPoolWithoutBaseTokenFactory,
    [router.address, protocolManager.address]
  )) as PancakeswapStrategyAddToPoolWithoutBaseToken;
  await PancakeswapStrategyAddToPoolWithoutBaseToken.deployed();

  const PancakeswapStrategyLiquidateFactory = (await ethers.getContractFactory(
    "PancakeswapStrategyLiquidate",
    deployer
  )) as PancakeswapStrategyLiquidate__factory;
  const PancakeswapStrategyLiquidate = (await upgrades.deployProxy(
    PancakeswapStrategyLiquidateFactory,
    [router.address, protocolManager.address]
  )) as PancakeswapStrategyLiquidate;
  await PancakeswapStrategyLiquidate.deployed();

  return [
    PancakeswapStrategyAddToPoolWithBaseToken,
    PancakeswapStrategyAddToPoolWithoutBaseToken,
    PancakeswapStrategyLiquidate,
  ];
};
