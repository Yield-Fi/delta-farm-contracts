import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger("---> Deploying bounty collector... <---");

  const BountyCollectorFactory = await ethers.getContractFactory("BountyCollector", deployer);

  const BountyCollector = await upgrades.deployProxy(BountyCollectorFactory, [
    config.baseToken,
    config.bountyThreshold,
  ]);

  await BountyCollector.deployed();
  logger(`- BountyCollector deployed at ${BountyCollector.address}`);
};

export default deployFunc;
deployFunc.tags = ["BountyCollector"];
