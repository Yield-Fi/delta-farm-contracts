import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import {
  PancakeswapStrategyAddToPoolWithBaseToken,
  PancakeswapStrategyAddToPoolWithoutBaseToken,
  PancakeswapWorker__factory,
} from "../../../typechain";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

/**
 * RECONFIGURATION SCRIPT - TEMPLATE - USE ONLY ONCE
 * Date of issue: 13.01.2022
 * Date of resolve: 19.01.2022
 * Date of call: 19.01.2022
 * Description: Strategies were estimating wrong amounts since no multi hops were taken into account
 * Solution: Pass the estimation through the list of "stables" - coins with high liquidity
 * Measures taken:
 * - Protocol Manager now handles the list of stables to be taken into account during the amount's estimate
 * - Strategies pull the list of stables to run through from the PM - we have to inject PM into strategy initializer (main point of redeploy)
 * - Protocol Manager must be supplied with list of stables after the deployment (see the getStables/setStables)
 * - Since we are deploying new strategies, we have to re-set them withing the farms to utilize new logic
 * Disclaimer: Cannot upgrade strategies since we have to inject PM during the first upgradeable initialization
 */

const deployFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger("---> Initializing strategy reconfiguration <---");
  logger("--> Upgrading protocol manager (stables getter and setter) <--");
  const ProtocolManagerFactory = await ethers.getContractFactory("ProtocolManager", deployer);

  const ProtocolManager = await upgrades.upgradeProxy(
    config.protocolManager,
    ProtocolManagerFactory
  );

  await ProtocolManager.deployed();
  logger("- Protocol manager upgraded successfully.");

  const stables = Object.entries(config.tokens).map(([, address]) => address.toLowerCase()); // All current tokens should be good to go

  await ProtocolManager.setStables(stables);

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
  logger(`- New strategies approved successfully`);

  for (const farm of config.vaults[0].workers) {
    const _farm = PancakeswapWorker__factory.connect(farm.address, deployer);
    logger(`- Setting new strategies for farm ${farm.name} (${farm.address})`);

    await _farm.setStrategies([
      AddToPoolWithBaseTokenStrategy.address,
      AddToPoolWithoutBaseTokenStrategy.address,
      LiquidateStrategy.address,
    ]);

    logger(`- New strategies set successfully for farm ${farm.name}`);
  }

  logger("---> Strategy reconfiguration finished successfully <---");
};

export default deployFunc;
deployFunc.tags = ["PancakeswapStrategiesReconfiguration"];
