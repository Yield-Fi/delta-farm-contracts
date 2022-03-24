"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployPancakeStrategies = void 0;
const hardhat_1 = require("hardhat");
const deployPancakeStrategies = async (router, deployer, protocolManager) => {
    /// Setup strategy
    const PancakeswapStrategyAddToPoolWithBaseTokenFactory = (await hardhat_1.ethers.getContractFactory("PancakeswapStrategyAddToPoolWithBaseToken", deployer));
    const PancakeswapStrategyAddToPoolWithBaseToken = (await hardhat_1.upgrades.deployProxy(PancakeswapStrategyAddToPoolWithBaseTokenFactory, [router.address, protocolManager.address]));
    await PancakeswapStrategyAddToPoolWithBaseToken.deployed();
    const PancakeswapStrategyAddToPoolWithoutBaseTokenFactory = (await hardhat_1.ethers.getContractFactory("PancakeswapStrategyAddToPoolWithoutBaseToken", deployer));
    const PancakeswapStrategyAddToPoolWithoutBaseToken = (await hardhat_1.upgrades.deployProxy(PancakeswapStrategyAddToPoolWithoutBaseTokenFactory, [router.address, protocolManager.address]));
    await PancakeswapStrategyAddToPoolWithoutBaseToken.deployed();
    const PancakeswapStrategyLiquidateFactory = (await hardhat_1.ethers.getContractFactory("PancakeswapStrategyLiquidate", deployer));
    const PancakeswapStrategyLiquidate = (await hardhat_1.upgrades.deployProxy(PancakeswapStrategyLiquidateFactory, [router.address, protocolManager.address]));
    await PancakeswapStrategyLiquidate.deployed();
    return [
        PancakeswapStrategyAddToPoolWithBaseToken,
        PancakeswapStrategyAddToPoolWithoutBaseToken,
        PancakeswapStrategyLiquidate,
    ];
};
exports.deployPancakeStrategies = deployPancakeStrategies;
