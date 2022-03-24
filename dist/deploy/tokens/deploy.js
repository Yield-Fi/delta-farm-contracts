"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const units_1 = require("@ethersproject/units");
const hardhat_1 = require("hardhat");
const logger_1 = require("../utils/logger");
const deployFun = async function () {
    const [deployer] = await hardhat_1.ethers.getSigners();
    const tokensToDeploy = ["BUSD", "USDT", "ETH", "USDC", "ADA", "DAI", "BTC"];
    const amountToMint = (0, units_1.parseEther)("100000000");
    const MockTokenFactory = (await hardhat_1.ethers.getContractFactory("MockToken", deployer));
    (0, logger_1.logger)("---> Deploying test tokens... <---");
    for (const token of tokensToDeploy) {
        const MockToken = (await hardhat_1.upgrades.deployProxy(MockTokenFactory, [
            `${token} test token`,
            token,
        ]));
        await MockToken.deployed();
        await MockToken.mint(deployer.address, amountToMint);
        (0, logger_1.logger)(`- ${token}: ${MockToken.address}`);
    }
};
exports.default = deployFun;
deployFun.tags = ["TestTokens"];
