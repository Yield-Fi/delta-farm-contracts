"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Worker02Helper = void 0;
const typechain_1 = require("../../typechain");
const hardhat_1 = require("hardhat");
class Worker02Helper {
    constructor(_workerAddress, _masterChefAddress) {
        this.worker = typechain_1.PancakeswapWorker__factory.connect(_workerAddress, hardhat_1.ethers.provider);
        this.masterChef = typechain_1.PancakeMasterChef__factory.connect(_masterChefAddress, hardhat_1.ethers.provider);
    }
    computeShareToBalance(share, totalShare, totalBalance) {
        if (totalShare.eq(0))
            return share;
        return share.mul(totalBalance).div(totalShare);
    }
    computeBalanceToShare(balance, totalShare, totalBalance) {
        if (totalShare.eq(0))
            return balance;
        return balance.mul(totalShare).div(totalBalance);
    }
}
exports.Worker02Helper = Worker02Helper;
