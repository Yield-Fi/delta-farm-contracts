"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployWBNB = exports.deployToken = exports.deployTokens = void 0;
const hardhat_1 = require("hardhat");
const deployTokens = async (tokens, deployer) => {
    const promises = [];
    for (const token of tokens) {
        promises.push((0, exports.deployToken)(token, deployer));
    }
    return Promise.all(promises);
};
exports.deployTokens = deployTokens;
const deployToken = async (token, deployer) => {
    const MockTokenFactory = await hardhat_1.ethers.getContractFactory("MockToken", deployer);
    const MockToken = (await hardhat_1.upgrades.deployProxy(MockTokenFactory, [
        token.name,
        token.symbol,
    ]));
    await MockToken.deployed();
    if (token.holders !== undefined) {
        token.holders.forEach(async (holder) => await MockToken.mint(holder.address, holder.amount));
    }
    return MockToken;
};
exports.deployToken = deployToken;
const deployWBNB = async (deployer) => {
    const WBNB = (await hardhat_1.ethers.getContractFactory("MockWBNB", deployer));
    const wbnb = await WBNB.deploy();
    await wbnb.deployed();
    return wbnb;
};
exports.deployWBNB = deployWBNB;
