import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { Admin, ProtocolManager__factory } from "../../../typechain";
import { logger } from "../../utils/logger";
import { getConfig } from "../../utils/config";

const deployFunc: DeployFunction = async () => {
  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  logger("---> Deploying Admin contract... <---");

  const AdminFactory = await ethers.getContractFactory("Admin", deployer);

  const Admin = (await upgrades.deployProxy(AdminFactory, [config.protocolManager])) as Admin;

  await Admin.deployed();

  const ProtocolManager = ProtocolManager__factory.connect(config.protocolManager, deployer);

  await ProtocolManager.approveAdminContract(Admin.address);

  logger(`- Admin contract deployed at ${Admin.address}`);
};

export default deployFunc;
deployFunc.tags = ["Admin"];
