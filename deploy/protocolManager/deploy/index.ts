import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { ProtocolManager } from "../../../typechain";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  const [deployer] = await ethers.getSigners();

  logger("---> Deploying ProtocolManager... <---");

  const ProtocolManagerFactory = await ethers.getContractFactory("ProtocolManager", deployer);

  const ProtocolManager = (await upgrades.deployProxy(ProtocolManagerFactory)) as ProtocolManager;

  await ProtocolManager.deployed();

  logger(`- ProtocolManager deployed at ${ProtocolManager.address}`);
};

export default deployFunc;
deployFunc.tags = ["ProtocolManager"];
