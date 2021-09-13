import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const upgradeFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger(
    "---> Upgrading strategies implementation for the pancakeswap workers... <---"
  );

  const addBaseTokenOnlyStrategyProxyAddress =
    config.strategies.pancakeswap.AddBaseToken;

  if (!addBaseTokenOnlyStrategyProxyAddress) {
    throw new Error(
      "Address for PancakeswapStrategyAddBaseTokenOnly not found"
    );
  }

  const AddBaseTokenOnlyStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyAddBaseTokenOnly",
    deployer
  );

  const AddBaseTokenOnlyStrategy = await upgrades.upgradeProxy(
    addBaseTokenOnlyStrategyProxyAddress,
    AddBaseTokenOnlyStrategyFactory
  );

  await AddBaseTokenOnlyStrategy.deployed();
  logger(
    `- new implementation of AddBaseTokenOnlyStrategy deployed at ${AddBaseTokenOnlyStrategy.address}`
  );

  const liquidateStrategyProxyAddress = config.strategies.pancakeswap.Liquidate;

  const LiquidateStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyLiquidate",
    deployer
  );

  const LiquidateStrategy = await upgrades.upgradeProxy(
    liquidateStrategyProxyAddress,
    LiquidateStrategyFactory
  );

  await LiquidateStrategy.deployed();
  logger(
    `- new implementation of LiquidateStrategy deployed at ${LiquidateStrategy.address}`
  );
};

export default upgradeFunc;
upgradeFunc.tags = ["PancakeswapStrategiesUpgrade"];
