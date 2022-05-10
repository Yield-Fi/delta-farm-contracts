import { WorkerConfigType, getConfig } from "../../utils/config";
import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { PancakeswapWorker, ProtocolManager__factory } from "../../../typechain";
import { logger } from "../../utils/logger";
import { parseEther } from "@ethersproject/units";

const deployFunc: DeployFunction = async () => {
  // The array of workers' names to deploy.
  const workersToDeploy: Array<WorkerConfigType["name"]> = [
    "BUSD-USDT Pancakeswap V2",
    "BUSD-DAI Pancakeswap V2",
    "USDT-DAI Pancakeswap V2",
    "WBNB-BUSD Pancakeswap V2",
    "WBNB-USDT Pancakeswap V2",
    "WBNB-CAKE Pancakeswap V2",
  ];

  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  const workersFilter = (worker: WorkerConfigType) =>
    workersToDeploy.includes(worker.name) || workersToDeploy.length === 0;

  const deployedWorkers = [];

  logger("---> Deploying pancakeswap workers... <---");
  for (const vault of config.vaults) {
    logger(`-> Deploying workers for ${vault.name}`);
    for (const worker of vault.workers.pancakeV2.filter(workersFilter)) {
      logger(`  - Deploying ${worker.name}...`);
      const PancakeswapWorkerFactory = await ethers.getContractFactory(
        "PancakeswapWorkerV2",
        deployer
      );

      const PancakeswapWorker = (await upgrades.deployProxy(PancakeswapWorkerFactory, [
        worker.name,
        vault.address,
        config.baseToken,
        config.dex.pancakeswap.MasterChefV2,
        config.dex.pancakeswap.RouterV2,
        worker.poolId,
        [config.tokens.CAKE, config.baseToken],
        parseEther(worker.defaultHarvestThreshold),
        config.defaultTreasuryFeeBps,
        config.protocolManager,
      ])) as PancakeswapWorker;

      await PancakeswapWorker.deployed();
      deployedWorkers.push(PancakeswapWorker.address);

      await (
        await PancakeswapWorker.setStrategies([
          config.strategies.pancakeswap.AddToPoolWithBaseToken,
          config.strategies.pancakeswap.AddToPoolWithoutBaseToken,
          config.strategies.pancakeswap.Liquidate,
        ])
      ).wait();

      logger(`  - ${worker.name} deployed at ${PancakeswapWorker.address}`);
    }
  }

  const ProtocolManager = ProtocolManager__factory.connect(config.protocolManager, deployer);

  await (await ProtocolManager.approveWorkers(deployedWorkers, true, { gasLimit: 300000 })).wait();
};

export default deployFunc;
deployFunc.tags = ["PancakeswapWorkersV2"];
