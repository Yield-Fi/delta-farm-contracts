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
  SpookySwapStrategyAddToPoolWithBaseToken,
  SpookySwapStrategyAddToPoolWithBaseToken__factory,
  SpookySwapStrategyAddToPoolWithoutBaseToken,
  SpookySwapStrategyAddToPoolWithoutBaseToken__factory,
  SpookySwapStrategyLiquidate,
  SpookySwapStrategyLiquidate__factory,
  UniswapV2Router02,
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

export const deploySpookySwapStrategies = async (
  router: UniswapV2Router02,
  deployer: Signer,
  protocolManager: ProtocolManager
): Promise<
  [
    SpookySwapStrategyAddToPoolWithBaseToken,
    SpookySwapStrategyAddToPoolWithoutBaseToken,
    SpookySwapStrategyLiquidate
  ]
> => {
  /// Setup strategy
  const SpookySwapStrategyAddToPoolWithBaseTokenFactory = (await ethers.getContractFactory(
    "SpookySwapStrategyAddToPoolWithBaseToken",
    deployer
  )) as SpookySwapStrategyAddToPoolWithBaseToken__factory;
  const SpookySwapStrategyAddToPoolWithBaseToken = (await upgrades.deployProxy(
    SpookySwapStrategyAddToPoolWithBaseTokenFactory,
    [router.address, protocolManager.address]
  )) as SpookySwapStrategyAddToPoolWithBaseToken;
  await SpookySwapStrategyAddToPoolWithBaseToken.deployed();

  const SpookySwapStrategyAddToPoolWithoutBaseTokenFactory = (await ethers.getContractFactory(
    "SpookySwapStrategyAddToPoolWithoutBaseToken",
    deployer
  )) as SpookySwapStrategyAddToPoolWithoutBaseToken__factory;
  const SpookySwapStrategyAddToPoolWithoutBaseToken = (await upgrades.deployProxy(
    SpookySwapStrategyAddToPoolWithoutBaseTokenFactory,
    [router.address, protocolManager.address]
  )) as SpookySwapStrategyAddToPoolWithoutBaseToken;
  await SpookySwapStrategyAddToPoolWithoutBaseToken.deployed();

  const SpookySwapStrategyLiquidateFactory = (await ethers.getContractFactory(
    "SpookySwapStrategyLiquidate",
    deployer
  )) as SpookySwapStrategyLiquidate__factory;
  const SpookySwapStrategyLiquidate = (await upgrades.deployProxy(
    SpookySwapStrategyLiquidateFactory,
    [router.address, protocolManager.address]
  )) as SpookySwapStrategyLiquidate;
  await SpookySwapStrategyLiquidate.deployed();

  return [
    SpookySwapStrategyAddToPoolWithBaseToken,
    SpookySwapStrategyAddToPoolWithoutBaseToken,
    SpookySwapStrategyLiquidate,
  ];
};
