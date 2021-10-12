import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger("---> Upgrading implementation of fee collector... <---");

  const feeCollectorAddress = config.feeCollector;

  if (!feeCollectorAddress) {
    throw new Error("Address for FeeCollector not found");
  }

  const FeeCollectorFactory = await ethers.getContractFactory("FeeCollector", deployer);

  const FeeCollector = await upgrades.upgradeProxy(feeCollectorAddress, FeeCollectorFactory);

  await FeeCollector.deployed();
  logger(`- New implementation of FeeCollector deployed at ${FeeCollector.address}`);
};

export default deployFunc;
deployFunc.tags = ["FeeCollectorUpgrade"];
