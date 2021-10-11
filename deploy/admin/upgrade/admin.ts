import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { Admin } from "../../../typechain";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  logger("---> Upgrading Admin contract implementation... <---");

  const AdminFactory = await ethers.getContractFactory("Admin", deployer);

  const Admin = (await upgrades.upgradeProxy(config.adminContract, AdminFactory)) as Admin;

  await Admin.deployed();

  logger(`- Implementation of Admin contract deployed at ${Admin.address}`);
};

export default deployFunc;
deployFunc.tags = ["AdminUpgrade"];
