import { WorkerConfigType, getConfig } from "../../utils/config";
import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { PancakeswapWorker, ProtocolManager__factory } from "../../../typechain";
import { logger } from "../../utils/logger";
import { parseEther } from "@ethersproject/units";

const deployFunc: DeployFunction = async () => {
  // The array of workers' names to deploy.
  const workersToDeploy: Array<WorkerConfigType["name"]> = [
    "BUSD-USDT PancakeswapWorker",
    "BUSD-DAI PancakeswapWorker",
    "USDT-DAI PancakeswapWorker",
    "WBNB-BUSD PancakeswapWorker",
    "WBNB-USDT PancakeswapWorker",
    "WBNB-CAKE PancakeswapWorker",
  ];

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
        worker.name,
        vault.address,
        config.baseToken,
        config.dex.pancakeswap.MasterChef,
        config.dex.pancakeswap.RouterV2,
        worker.positionId,
        [config.tokens.CAKE, config.baseToken],
        parseEther(worker.defaultHarvestThresshold),
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
