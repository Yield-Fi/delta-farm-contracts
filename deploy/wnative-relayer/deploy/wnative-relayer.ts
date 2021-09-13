import { DeployFunction } from "hardhat-deploy/types";
import { ethers, upgrades } from "hardhat";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFun: DeployFunction = async function () {
  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  logger("---> Deploying VNativeRelayer... <---");

  const WNativeRelayerFactory = await ethers.getContractFactory(
    "WNativeRelayer",
    deployer
  );

  const WNativeRelayer = await upgrades.deployProxy(
    WNativeRelayerFactory,
    [config.tokens.WBNB],
    { kind: "uups" }
  );

  await WNativeRelayer.deployed();

  logger(`- WNativeRelayer deployed at ${WNativeRelayer.address}`);
};

export default deployFun;
deployFun.tags = ["WNativeRelayer"];
