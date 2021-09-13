import { network } from "hardhat";
import { mainnetConfig, testnetConfig } from "../../configs";

export const getConfig = () => {
  return network.name === "testnet" ? testnetConfig : mainnetConfig;
};

const ConfigEntity = {
  getConfig,
};

export { ConfigEntity };
export * from "../../configs";
