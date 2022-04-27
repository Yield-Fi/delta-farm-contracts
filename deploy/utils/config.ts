import { network } from "hardhat";
import { mainnetConfig, testnetConfig, testnetDevConfig } from "../../configs";

export const getConfig = () => {
  switch (network.name) {
    case "testnet":
      return testnetConfig;
    case "mainnet":
      return mainnetConfig;
    case "testnet-dev":
      return testnetDevConfig;
    case "hardhat":
      return mainnetConfig;
    default:
      throw Error("Config file not found");
  }
};

const ConfigEntity = {
  getConfig,
};

export { ConfigEntity };
export * from "../../configs";
