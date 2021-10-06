import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { ProtocolManager__factory } from "../../../typechain";
import { getConfig, ClientConfigType } from "../../utils/config";
import { logger } from "../../utils/logger";

const deployFun: DeployFunction = async function () {
  // The array of client's names to deploy.
  const clientsToDeploy = ["Client A"];

  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  const clientFilter = (client: ClientConfigType) => clientsToDeploy.includes(client.name);

  logger("---> Deploying Client contracts... <---");

  for (const client of config.clients.filter(clientFilter)) {
    logger(`  -> Contract of ${client.name}`);

    const ClientFactory = await ethers.getContractFactory("Client", deployer);

    const Client = await upgrades.deployProxy(ClientFactory, [
      client.kind,
      client.name,
      config.protocolManager,
    ]);

    await Client.deployed();

    const ProtocolManager = ProtocolManager__factory.connect(config.protocolManager, deployer);

    await ProtocolManager.approveClientContract(Client.address, true);

    logger(`  - Contract of ${client.name} deployed at ${Client.address}`);
  }
};

export default deployFun;
deployFun.tags = ["Client"];
