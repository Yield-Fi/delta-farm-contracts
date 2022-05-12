import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-deploy";
import "solidity-coverage";
// import "hardhat-contract-sizer";
import "hardhat-abi-exporter";

import { config as dotEnvConfig } from "dotenv";
import { task } from "hardhat/config";

dotEnvConfig();

const fallbackKey = "0000000000000000000000000000000000000000000000000000000000000000";

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

const testnet = {
  url: "https://speedy-nodes-nyc.moralis.io/83540647ff8090fcdcb13b29/bsc/testnet",
  accounts: [process.env.TESTNET_PRIVATE_KEY ?? fallbackKey],
};

const mainnet = {
  url: "https://bsc-dataseed.binance.org/",
  accounts: [process.env.TESTNET_PRIVATE_KEY ?? fallbackKey],
  gasPrice: 20000000000,
};

export default {
  networks: {
    mainnet,
    testnet,
    ["testnet-dev"]: testnet,
    hardhat: {
      forking: {
        url: "https://speedy-nodes-nyc.moralis.io/83540647ff8090fcdcb13b29/bsc/testnet",
      },
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
      {
        version: "0.8.1",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
    ],
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
