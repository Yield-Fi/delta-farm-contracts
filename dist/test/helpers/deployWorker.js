"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployPancakeWorker = void 0;
const hardhat_1 = require("hardhat");
const deployPancakeWorker = async (vault, name, baseToken, masterChef, router, poolId, reinvestPath, reinvestThreshold, treasuryFeeBps, protocolManager, deployer) => {
    const PancakeswapWorker = (await hardhat_1.ethers.getContractFactory("PancakeswapWorker", deployer));
    const pancakeswapWorker = (await hardhat_1.upgrades.deployProxy(PancakeswapWorker, [
        name,
        vault.address,
        baseToken.address,
        masterChef.address,
        router.address,
        poolId,
        reinvestPath,
        reinvestThreshold,
        treasuryFeeBps,
        protocolManager,
    ]));
    await pancakeswapWorker.deployed();
    return pancakeswapWorker;
};
exports.deployPancakeWorker = deployPancakeWorker;
