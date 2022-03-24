"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.advanceBlockTo = exports.duration = exports.increase = exports.advanceBlock = exports.latestBlockNumber = exports.latest = void 0;
const hardhat_1 = require("hardhat");
async function latest() {
    const block = await hardhat_1.ethers.provider.getBlock("latest");
    return hardhat_1.ethers.BigNumber.from(block.timestamp);
}
exports.latest = latest;
async function latestBlockNumber() {
    const block = await hardhat_1.ethers.provider.getBlock("latest");
    return hardhat_1.ethers.BigNumber.from(block.number);
}
exports.latestBlockNumber = latestBlockNumber;
async function advanceBlock() {
    await hardhat_1.ethers.provider.send("evm_mine", []);
}
exports.advanceBlock = advanceBlock;
async function increase(duration) {
    if (duration.isNegative())
        throw Error(`Cannot increase time by a negative amount (${duration})`);
    await hardhat_1.ethers.provider.send("evm_increaseTime", [duration.toNumber()]);
    await advanceBlock();
}
exports.increase = increase;
exports.duration = {
    seconds: function (val) {
        return hardhat_1.ethers.BigNumber.from(String(val));
    },
    minutes: function (val) {
        return hardhat_1.ethers.BigNumber.from(String(val)).mul(this.seconds(60));
    },
    hours: function (val) {
        return hardhat_1.ethers.BigNumber.from(String(val)).mul(this.minutes(60));
    },
    days: function (val) {
        return hardhat_1.ethers.BigNumber.from(String(val)).mul(this.hours(24));
    },
    weeks: function (val) {
        return hardhat_1.ethers.BigNumber.from(String(val)).mul(this.days(7));
    },
    years: function (val) {
        return hardhat_1.ethers.BigNumber.from(String(val)).mul(this.days(365));
    },
};
async function advanceBlockTo(block) {
    let latestBlock = (await latestBlockNumber()).toNumber();
    if (block <= latestBlock) {
        throw new Error("input block exceeds current block");
    }
    while (block > latestBlock) {
        await advanceBlock();
        latestBlock++;
    }
}
exports.advanceBlockTo = advanceBlockTo;
