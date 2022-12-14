import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import {
  PancakeswapStrategyAddToPoolWithBaseToken,
  PancakeswapStrategyAddToPoolWithoutBaseToken,
  ProtocolManager__factory,
} from "../../../typechain";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  const ProtocolManager = ProtocolManager__factory.connect(config.protocolManager, deployer);

  logger("---> Deploying strategies for the pancakeswap workers... <---");

  const AddToPoolWithBaseTokenStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyAddToPoolWithBaseToken",
    deployer
  );

  const AddToPoolWithBaseTokenStrategy = (await upgrades.deployProxy(
    AddToPoolWithBaseTokenStrategyFactory,
    [config.dex.pancakeswap.RouterV2, ProtocolManager.address]
  )) as PancakeswapStrategyAddToPoolWithBaseToken;

  await AddToPoolWithBaseTokenStrategy.deployed();
  logger(
    `- PancakeswapStrategyAddToPoolWithBaseToken deployed at ${AddToPoolWithBaseTokenStrategy.address}`
  );

  const AddToPoolWithoutBaseTokenStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyAddToPoolWithoutBaseToken",
    deployer
  );

  const AddToPoolWithoutBaseTokenStrategy = (await upgrades.deployProxy(
    AddToPoolWithoutBaseTokenStrategyFactory,
    [config.dex.pancakeswap.RouterV2, ProtocolManager.address]
  )) as PancakeswapStrategyAddToPoolWithoutBaseToken;

  await AddToPoolWithoutBaseTokenStrategy.deployed();
  logger(
    `- PancakeswapStrategyAddToPoolWithoutBaseToken deployed at ${AddToPoolWithoutBaseTokenStrategy.address}`
  );

  const LiquidateStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyLiquidate",
    deployer
  );

  const LiquidateStrategy = await upgrades.deployProxy(LiquidateStrategyFactory, [
    config.dex.pancakeswap.RouterV2,
    ProtocolManager.address,
  ]);

  await LiquidateStrategy.deployed();
  logger(`- LiquidateStrategy deployed at ${LiquidateStrategy.address}`);

  await ProtocolManager.approveStrategies(
    [
      AddToPoolWithBaseTokenStrategy.address,
      AddToPoolWithoutBaseTokenStrategy.address,
      LiquidateStrategy.address,
    ],
    true
  );
};

export default deployFunc;
deployFunc.tags = ["PancakeswapStrategies"];
