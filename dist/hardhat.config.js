"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
require("@typechain/hardhat");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-waffle");
// import "@openzeppelin/hardhat-upgrades";
require("hardhat-deploy");
require("solidity-coverage");
// import "hardhat-contract-sizer";
// import "hardhat-abi-exporter";
const dotenv_1 = require("dotenv");
const config_1 = require("hardhat/config");
(0, dotenv_1.config)();
(0, config_1.task)("accounts", "Prints the list of accounts", async (args, hre) => {
    const accounts = await hre.ethers.getSigners();
    for (const account of accounts) {
        console.log(await account.address);
    }
});
const testnet = {
    url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    accounts: [(_a = process.env.TESTNET_PRIVATE_KEY) !== null && _a !== void 0 ? _a : "0000"],
};
const mainnet = {
    url: "https://bsc-dataseed.binance.org/",
    accounts: [(_b = process.env.TESTNET_PRIVATE_KEY) !== null && _b !== void 0 ? _b : "0000"],
    gasPrice: 20000000000,
};
exports.default = {
    networks: {
        mainnet,
        testnet,
        ["testnet-dev"]: testnet,
        hardhat: {
            chainId: 31337,
            gas: 12000000,
            blockGasLimit: 0x1fffffffffffff,
            allowUnlimitedContractSize: true,
            timeout: 1800000,
        },
    },
    solidity: {
        version: "0.6.6",
        settings: {
            optimizer: {
                enabled: true,
                runs: 1,
            },
        },
    },
    typechain: {
        outDir: "./typechain",
        target: "ethers-v5",
        alwaysGenerateOverloads: false,
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    mocha: {
        timeout: 50000,
    },
    abiExporter: {
        clear: true,
    },
};
