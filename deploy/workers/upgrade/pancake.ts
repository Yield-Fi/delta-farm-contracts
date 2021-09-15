import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { PancakeswapWorker } from "../../../typechain";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const upgradeFunc: DeployFunction = async () => {
  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  logger("--> Deploying pancakeswap workers... <--");
  config.vaults.forEach((vault) => {
    logger(`- Workers for ${vault.name}`);
    vault.workers.forEach(async (worker, index) => {
      logger(`  ${index + 1}. Upgrading ${worker.name}...`);
      const PancakeswapWorkerFactory = await ethers.getContractFactory(
        "PancakeswapWorker",
        deployer
      );

      const PancakeswapWorker = (await upgrades.upgradeProxy(
        worker.address,
        PancakeswapWorkerFactory
      )) as PancakeswapWorker;

      await PancakeswapWorker.deployed();

      logger(`  New implementation of ${worker.name} deployed at ${PancakeswapWorker.address}`);
    });
  });
};

export default upgradeFunc;
upgradeFunc.tags = ["PancakeswapWorkersUpgrade"];
