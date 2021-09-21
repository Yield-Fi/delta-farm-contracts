import { WorkerConfigType, getConfig } from "../../utils/config";
import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { BountyCollector__factory, PancakeswapWorker } from "../../../typechain";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  // The array of workers' names to deploy. To deploy all workers pass an empty array.
  const workersToDeploy: Array<WorkerConfigType["name"]> = [];

  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  const workersFilter = (worker: WorkerConfigType) =>
    workersToDeploy.includes(worker.name) || workersToDeploy.length === 0;

  const deployedWorkers = [];

  logger("---> Deploying pancakeswap workers... <---");
  for (const vault of config.vaults) {
    logger(`-> Deploying workers for ${vault.name}`);
    for (const worker of vault.workers.filter(workersFilter)) {
      logger(`  - Deploying ${worker.name}...`);
      const PancakeswapWorkerFactory = await ethers.getContractFactory(
        "PancakeswapWorker",
        deployer
      );

      const PancakeswapWorker = (await upgrades.deployProxy(PancakeswapWorkerFactory, [
        vault.address,
        config.baseToken,
        config.dex.pancakeswap.MasterChef,
        config.dex.pancakeswap.RouterV2,
        worker.positionId,
        config.strategies.pancakeswap.AddBaseToken,
        [config.tokens.CAKE, worker.token0],
        config.defaultReinvestThreshold,
        config.bountyCollector,
        config.defaultTreasuryFeeBps,
        [config.tokens.CAKE, config.tokens.WBNB, config.baseToken],
      ])) as PancakeswapWorker;

      await PancakeswapWorker.deployed();
      deployedWorkers.push(PancakeswapWorker.address);

      logger(`  - ${worker.name} deployed at ${PancakeswapWorker.address}`);
    }
  }

  const BountyCollector = await BountyCollector__factory.connect(config.bountyCollector, deployer);
  BountyCollector.whitelistWorkers(deployedWorkers, true);
  logger(`  - New workers have been whitelisted in the bounty collector`);
};

export default deployFunc;
deployFunc.tags = ["PancakeswapWorkers"];
