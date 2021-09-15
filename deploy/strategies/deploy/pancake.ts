import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { PancakeswapStrategyAddBaseTokenOnly } from "../../../typechain";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger("---> Deploying strategies for the pancakeswap workers... <---");

  const AddBaseTokenOnlyStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyAddBaseTokenOnly",
    deployer
  );

  const AddBaseTokenOnlyStrategy = (await upgrades.deployProxy(
    AddBaseTokenOnlyStrategyFactory,
    [config.dex.pancakeswap.RouterV2],
    { kind: "uups" }
  )) as PancakeswapStrategyAddBaseTokenOnly;

  await AddBaseTokenOnlyStrategy.deployed();
  logger(`- AddBaseTokenOnlyStrategy deployed at ${AddBaseTokenOnlyStrategy.address}`);

  const LiquidateStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyLiquidate",
    deployer
  );

  const LiquidateStrategy = await upgrades.deployProxy(
    LiquidateStrategyFactory,
    [config.dex.pancakeswap.RouterV2],
    {
      kind: "uups",
    }
  );

  await LiquidateStrategy.deployed();
  logger(`- LiquidateStrategy deployed at ${LiquidateStrategy.address}`);
};

export default deployFunc;
deployFunc.tags = ["PancakeswapStrategies"];
