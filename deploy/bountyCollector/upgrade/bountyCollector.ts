import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger("---> Upgrading implementation of bounty collector... <---");

  const bountyCollectorAddress = config.bountyCollector;

  if (!bountyCollectorAddress) {
    throw new Error("Address for BountyCollector not found");
  }

  const BountyCollectorFactory = await ethers.getContractFactory("BountyCollector", deployer);

  const BountyCollector = await upgrades.upgradeProxy(
    bountyCollectorAddress,
    BountyCollectorFactory
  );

  await BountyCollector.deployed();
  logger(`- New implementation of BountyCollector deployed at ${BountyCollector.address}`);
};

export default deployFunc;
deployFunc.tags = ["BountyCollectorUpgrade"];
