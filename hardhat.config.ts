import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-deploy";
import "solidity-coverage";

import { config as dotEnvConfig } from "dotenv";
import { task } from "hardhat/config";

dotEnvConfig();

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

export default {
  networks: {
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: [process.env.TESTNET_PRIVATE_KEY],
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.3",
      },
      {
        version: "0.6.6",
      },
    ],
  },
  typechain: {
    outDir: "./typechain",
    target: "ethers-v5",
    alwaysGenerateOverloads: false,
  },
};
