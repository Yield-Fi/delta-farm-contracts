import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger("---> Deploying fee collector... <---");

  const FeeCollectorFactory = await ethers.getContractFactory("FeeCollector", deployer);

  const FeeCollector = await upgrades.deployProxy(FeeCollectorFactory, [
    config.baseToken,
    config.feeThreshold,
    config.protocolManager,
  ]);

  await FeeCollector.deployed();
  logger(`- FeeCollector deployed at ${FeeCollector.address}`);
};

export default deployFunc;
deployFunc.tags = ["FeeCollector"];
