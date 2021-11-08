import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { Client } from "../../../typechain";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const upgradeFunc: DeployFunction = async () => {
  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  logger("--> Upgrading implementation of client contracts... <--");

  for (const client of config.clients) {
    logger(`  -> Upgrading contract of ${client.name}...`);

    const ClientFactory = await ethers.getContractFactory("Client", deployer);

    console.log(client.address);
    const Client = (await upgrades.upgradeProxy(client.address, ClientFactory)) as Client;

    await Client.deployed();

    logger(`  New implementation of contract of ${client.name} deployed at ${Client.address}`);
  }
};

export default upgradeFunc;
upgradeFunc.tags = ["ClientUpgrade"];
