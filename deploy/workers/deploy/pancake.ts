import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { PancakeswapWorker2 } from "../../../typechain";
import { getConfig, WorkerConfigType } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  // The array of workers' names to deploy. To deploy all workers pass an empty array.
  const workersToDeploy: Array<WorkerConfigType["name"]> = [];

  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  const workersFilter = (worker: WorkerConfigType) =>
    workersToDeploy.includes(worker.name) || workersToDeploy.length === 0;

  logger("---> Upgrading implementation of pancakeswap workers... <---");
  for (const vault of config.vaults) {
    logger(`-> Upgrading workers for ${vault.name}`);
    for (const worker of vault.workers.filter(workersFilter)) {
      logger(`  - Deploying ${worker.name}...`);
      const PancakeswapWorkerFactory = await ethers.getContractFactory(
        "PancakeswapWorker",
        deployer
      );

      const PancakeswapWorker = (await upgrades.deployProxy(
        PancakeswapWorkerFactory,
        [
          vault.address,
          vault.baseToken,
          config.dex.pancakeswap.MasterChef,
          config.dex.pancakeswap.RouterV2,
          worker.positionId,
        ],
        { kind: "uups" }
      )) as PancakeswapWorker2;

      await PancakeswapWorker.deployed();

      PancakeswapWorker.setReinvestConfig(
        config.treasuryAccount,
        1000,
        config.treasuryAccount,
        500,
        config.strategies.pancakeswap.AddBaseToken,
        1
      );

      logger(`  - ${worker.name} deployed at ${PancakeswapWorker.address}`);
    }
  }
};

export default deployFunc;
deployFunc.tags = ["PancakeswapWorkers"];
