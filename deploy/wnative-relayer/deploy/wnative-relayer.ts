import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFun: DeployFunction = async function () {
  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  logger("---> Deploying VNativeRelayer... <---");

  const WrappedNativeTokenRelayerFactory = await ethers.getContractFactory(
    "WrappedNativeTokenRelayer",
    deployer
  );

  const WrappedNativeTokenRelayer = await upgrades.deployProxy(WrappedNativeTokenRelayerFactory, [
    config.tokens.WBNB,
  ]);

  await WrappedNativeTokenRelayer.deployed();

  logger(`- WrappedNativeTokenRelayer deployed at ${WrappedNativeTokenRelayer.address}`);
};

export default deployFun;
deployFun.tags = ["WrappedNativeTokenRelayer"];
