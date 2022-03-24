"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployContract = exports.deployProxyContract = void 0;
const hardhat_1 = require("hardhat");
const deployProxyContract = async (contract, params, deployer) => {
    const ContractFactory = await hardhat_1.ethers.getContractFactory(contract, deployer);
    const Contract = await hardhat_1.upgrades.deployProxy(ContractFactory, params);
    await Contract.deployed();
    return Contract;
};
exports.deployProxyContract = deployProxyContract;
const deployContract = async (contract, params, deployer) => {
    const ContractFactory = await hardhat_1.ethers.getContractFactory(contract, deployer);
    const Contract = await ContractFactory.deploy(...params);
    await Contract.deployed();
    return Contract;
};
exports.deployContract = deployContract;
