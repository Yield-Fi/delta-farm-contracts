"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../../utils/config");
const hardhat_1 = require("hardhat");
const typechain_1 = require("../../../typechain");
const logger_1 = require("../../utils/logger");
const units_1 = require("@ethersproject/units");
const deployFunc = async () => {
    // The array of workers' names to deploy.
    const workersToDeploy = [
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
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    const workersFilter = (worker) => workersToDeploy.includes(worker.name) || workersToDeploy.length === 0;
    const deployedWorkers = [];
    (0, logger_1.logger)("---> Deploying pancakeswap workers... <---");
    for (const vault of config.vaults) {
        (0, logger_1.logger)(`-> Deploying workers for ${vault.name}`);
        for (const worker of vault.workers.filter(workersFilter)) {
            (0, logger_1.logger)(`  - Deploying ${worker.name}...`);
            const PancakeswapWorkerFactory = await hardhat_1.ethers.getContractFactory("PancakeswapWorker", deployer);
            const PancakeswapWorker = (await hardhat_1.upgrades.deployProxy(PancakeswapWorkerFactory, [
                worker.name,
                vault.address,
                config.baseToken,
                config.dex.pancakeswap.MasterChef,
                config.dex.pancakeswap.RouterV2,
                worker.poolId,
                [config.tokens.CAKE, config.baseToken],
                (0, units_1.parseEther)(worker.defaultHarvestThreshold),
                config.defaultTreasuryFeeBps,
                config.protocolManager,
            ]));
            await PancakeswapWorker.deployed();
            deployedWorkers.push(PancakeswapWorker.address);
            await PancakeswapWorker.setStrategies([
                config.strategies.pancakeswap.AddToPoolWithBaseToken,
                config.strategies.pancakeswap.AddToPoolWithoutBaseToken,
                config.strategies.pancakeswap.Liquidate,
            ]);
            (0, logger_1.logger)(`  - ${worker.name} deployed at ${PancakeswapWorker.address}`);
        }
    }
    const ProtocolManager = typechain_1.ProtocolManager__factory.connect(config.protocolManager, deployer);
    await ProtocolManager.approveWorkers(deployedWorkers, true);
};
exports.default = deployFunc;
deployFunc.tags = ["PancakeswapWorkers"];
