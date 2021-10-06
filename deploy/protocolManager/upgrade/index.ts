import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { ProtocolManager } from "../../../typechain";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger("---> Upgrading ProtocolManager implementation... <---");

  const ProtocolManagerFactory = await ethers.getContractFactory("ProtocolManager", deployer);

  const ProtocolManager = (await upgrades.upgradeProxy(
    config.protocolManager,
    ProtocolManagerFactory
  )) as ProtocolManager;

  await ProtocolManager.deployed();

  logger(`- Implementation of ProtocolManager deployed at ${ProtocolManager.address}`);
};

export default deployFunc;
deployFunc.tags = ["ProtocolManagerUpgrade"];
