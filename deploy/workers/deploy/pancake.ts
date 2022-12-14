import { WorkerConfigType, getConfig } from "../../utils/config";
import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { PancakeswapWorker, ProtocolManager__factory } from "../../../typechain";
import { logger } from "../../utils/logger";
import { parseEther } from "@ethersproject/units";

const deployFunc: DeployFunction = async () => {
  // The array of workers' names to deploy.
  const workersToDeploy: Array<WorkerConfigType["name"]> = [
    // "CAKE-WBNB Farm",    # Deployed
    // "USDT-BUSD Farm",    # Error
    // "WBNB-BUSD Farm",    # Deployed
    // "DAI-BUSD Farm",     # Deployed
    // "USDT-WBNB Farm",    # Error
    // "CAKE-BUSD Farm",    # Deployed
    // "CAKE-USDT Farm",    # Deployed
    // "BBT-BNB Farm",      # Deployed
    // "ETERNAL-BNB Farm",  # Deployed
    // "SANTOS-BNB Farm",   # Deployed
    // "BTCB-BUSD Farm",    # Deployed
    // "UST-BUSD Farm",     # Deployed
  ];

  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  const workersFilter = (worker: WorkerConfigType) =>
    workersToDeploy.includes(worker.name) || workersToDeploy.length === 0;

  const deployedWorkers = [];

  logger("---> Deploying pancakeswap workers... <---");
  for (const vault of config.vaults) {
    logger(`-> Deploying workers for ${vault.name}`);
    for (const worker of vault.workers.pancake.filter(workersFilter)) {
      logger(`  - Deploying ${worker.name}...`);
      const PancakeswapWorkerFactory = await ethers.getContractFactory(
        "PancakeswapWorker",
        deployer
      );

      const PancakeswapWorker = (await upgrades.deployProxy(PancakeswapWorkerFactory, [
        worker.name,
        vault.address,
        config.baseToken,
        config.dex.pancakeswap.MasterChef,
        config.dex.pancakeswap.RouterV2,
        worker.poolId,
        [config.tokens.CAKE, config.baseToken],
        parseEther(worker.defaultHarvestThreshold),
        config.defaultTreasuryFeeBps,
        config.protocolManager,
      ])) as PancakeswapWorker;

      await PancakeswapWorker.deployed();
      deployedWorkers.push(PancakeswapWorker.address);

      await PancakeswapWorker.setStrategies([
        config.strategies.pancakeswap.AddToPoolWithBaseToken,
        config.strategies.pancakeswap.AddToPoolWithoutBaseToken,
        config.strategies.pancakeswap.Liquidate,
      ]);

      logger(`  - ${worker.name} deployed at ${PancakeswapWorker.address}`);
    }
  }

  const ProtocolManager = ProtocolManager__factory.connect(config.protocolManager, deployer);

  await ProtocolManager.approveWorkers(deployedWorkers, true);
};

export default deployFunc;
deployFunc.tags = ["PancakeswapWorkers"];
