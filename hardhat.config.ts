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
    localhost: {
      url: "HTTP://127.0.0.1:7545",
      allowUnlimitedContractSize: true,
      timeout: 1800000,
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      chainId: 1337,
      accounts: [
        "09504ce5eb4b49ab8b64cac8372ae6a581fcd81e8ab5487a1dba715b57ab0c1d",
      ],
    },
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      allowUnlimitedContractSize: true,
      timeout: 1800000,
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
