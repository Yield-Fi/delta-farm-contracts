"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const typechain_1 = require("../../../typechain");
const config_1 = require("../../utils/config");
const logger_1 = require("../../utils/logger");
/**
 * RECONFIGURATION SCRIPT - TEMPLATE - USE ONLY ONCE
 * Date of issue: 13.01.2022
 * Date of resolve: 19.01.2022
 * Date of call: 19.01.2022
 * Description: Strategies were estimating wrong amounts since no multi hops were taken into account
 * Solution: Pass the estimation through the list of "stables" - coins with high liquidity
 * Measures taken:
 * - Protocol Manager now handles the list of stables to be taken into account during the amount's estimate
 * - Strategies pull the list of stables to run through from the PM - we have to inject PM into strategy initializer (main point of redeploy)
 * - Protocol Manager must be supplied with list of stables after the deployment (see the getStables/setStables)
 * - Since we are deploying new strategies, we have to re-set them withing the farms to utilize new logic
 * Disclaimer: Cannot upgrade strategies since we have to inject PM during the first upgradeable initialization
 */
const deployFunc = async () => {
    const config = (0, config_1.getConfig)();
    const [deployer] = await hardhat_1.ethers.getSigners();
    (0, logger_1.logger)("---> Initializing strategy reconfiguration <---");
    (0, logger_1.logger)("--> Upgrading protocol manager (stables getter and setter) <--");
    const ProtocolManagerFactory = await hardhat_1.ethers.getContractFactory("ProtocolManager", deployer);
    const ProtocolManager = await hardhat_1.upgrades.upgradeProxy(config.protocolManager, ProtocolManagerFactory);
    await ProtocolManager.deployed();
    (0, logger_1.logger)("- Protocol manager upgraded successfully.");
    const stables = Object.entries(config.tokens).map(([, address]) => address.toLowerCase()); // All current tokens should be good to go
    await ProtocolManager.setStables(stables);
    (0, logger_1.logger)("---> Deploying strategies for the pancakeswap workers... <---");
    const AddToPoolWithBaseTokenStrategyFactory = await hardhat_1.ethers.getContractFactory("PancakeswapStrategyAddToPoolWithBaseToken", deployer);
    const AddToPoolWithBaseTokenStrategy = (await hardhat_1.upgrades.deployProxy(AddToPoolWithBaseTokenStrategyFactory, [config.dex.pancakeswap.RouterV2, ProtocolManager.address]));
    await AddToPoolWithBaseTokenStrategy.deployed();
    (0, logger_1.logger)(`- PancakeswapStrategyAddToPoolWithBaseToken deployed at ${AddToPoolWithBaseTokenStrategy.address}`);
    const AddToPoolWithoutBaseTokenStrategyFactory = await hardhat_1.ethers.getContractFactory("PancakeswapStrategyAddToPoolWithoutBaseToken", deployer);
    const AddToPoolWithoutBaseTokenStrategy = (await hardhat_1.upgrades.deployProxy(AddToPoolWithoutBaseTokenStrategyFactory, [config.dex.pancakeswap.RouterV2, ProtocolManager.address]));
    await AddToPoolWithoutBaseTokenStrategy.deployed();
    (0, logger_1.logger)(`- PancakeswapStrategyAddToPoolWithoutBaseToken deployed at ${AddToPoolWithoutBaseTokenStrategy.address}`);
    const LiquidateStrategyFactory = await hardhat_1.ethers.getContractFactory("PancakeswapStrategyLiquidate", deployer);
    const LiquidateStrategy = await hardhat_1.upgrades.deployProxy(LiquidateStrategyFactory, [
        config.dex.pancakeswap.RouterV2,
        ProtocolManager.address,
    ]);
    await LiquidateStrategy.deployed();
    (0, logger_1.logger)(`- LiquidateStrategy deployed at ${LiquidateStrategy.address}`);
    await ProtocolManager.approveStrategies([
        AddToPoolWithBaseTokenStrategy.address,
        AddToPoolWithoutBaseTokenStrategy.address,
        LiquidateStrategy.address,
    ], true);
    (0, logger_1.logger)(`- New strategies approved successfully`);
    for (const farm of config.vaults[0].workers) {
        const _farm = typechain_1.PancakeswapWorker__factory.connect(farm.address, deployer);
        (0, logger_1.logger)(`- Setting new strategies for farm ${farm.name} (${farm.address})`);
        await _farm.setStrategies([
            AddToPoolWithBaseTokenStrategy.address,
            AddToPoolWithoutBaseTokenStrategy.address,
            LiquidateStrategy.address,
        ]);
        (0, logger_1.logger)(`- New strategies set successfully for farm ${farm.name}`);
    }
    (0, logger_1.logger)("---> Strategy reconfiguration finished successfully <---");
};
exports.default = deployFunc;
deployFunc.tags = ["PancakeswapStrategiesReconfiguration"];
