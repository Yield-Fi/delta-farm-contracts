import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const upgradeFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger("---> Upgrading strategies implementation for the pancakeswap workers... <---");

  const liquidateStrategyProxyAddress = config.strategies.pancakeswap.Liquidate;

  if (!liquidateStrategyProxyAddress) {
    throw new Error("Address for PancakeswapStrategyLiquidate not found");
  }

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
