import { Config } from "../interfaces/config";
import TestnetConfig from "../../.testnet.json";

// import { network } from "hardhat";

export function getConfig(): Config {
  return TestnetConfig;
}

const ConfigEntity = {
  getConfig,
};

export { ConfigEntity };
