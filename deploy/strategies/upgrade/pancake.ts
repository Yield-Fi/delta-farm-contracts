import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { ProtocolManager } from "../../../typechain";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const upgradeFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger("---> Upgrading strategies implementation for the pancakeswap workers... <---");

  const addToPoolWithBaseTokenStrategyProxyAddress =
    config.strategies.pancakeswap.AddToPoolWithBaseToken;

  if (!addToPoolWithBaseTokenStrategyProxyAddress) {
    throw new Error("Address for PancakeswapStrategyAddToPoolWithBaseToken not found");
  }

  const addToPoolWithoutBaseTokenStrategyProxyAddress =
    config.strategies.pancakeswap.AddToPoolWithoutBaseToken;

  if (!addToPoolWithoutBaseTokenStrategyProxyAddress) {
    throw new Error("Address for PancakeswapStrategyAddToPoolWithoutBaseToken not found");
  }

  const liquidateStrategyProxyAddress = config.strategies.pancakeswap.Liquidate;

  if (!liquidateStrategyProxyAddress) {
    throw new Error("Address for PancakeswapStrategyLiquidate not found");
  }

  const AddToPoolWithBaseTokenStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyAddToPoolWithBaseToken",
    deployer
  );

  const AddToPoolWithBaseTokenStrategy = await upgrades.upgradeProxy(
    addToPoolWithBaseTokenStrategyProxyAddress,
    AddToPoolWithBaseTokenStrategyFactory
  );

  await AddToPoolWithBaseTokenStrategy.deployed();
  logger(
    `- new implementation of AddToPoolWithBaseTokenStrategy deployed at ${AddToPoolWithBaseTokenStrategy.address}`
  );

  const AddToPoolWithoutBaseTokenStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyAddToPoolWithoutBaseToken",
    deployer
  );

  const AddToPoolWithoutBaseTokenStrategy = await upgrades.upgradeProxy(
    addToPoolWithoutBaseTokenStrategyProxyAddress,
    AddToPoolWithoutBaseTokenStrategyFactory
  );

  await AddToPoolWithoutBaseTokenStrategy.deployed();
  logger(
    `- new implementation of AddToPoolWithoutBaseTokenStrategy deployed at ${AddToPoolWithoutBaseTokenStrategy.address}`
  );

  const LiquidateStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyLiquidate",
    deployer
  );

  const LiquidateStrategy = await upgrades.upgradeProxy(
    liquidateStrategyProxyAddress,
    LiquidateStrategyFactory
  );

  await LiquidateStrategy.deployed();
  logger(`- new implementation of LiquidateStrategy deployed at ${LiquidateStrategy.address}`);
};

export default upgradeFunc;
upgradeFunc.tags = ["PancakeswapStrategiesUpgrade"];
