import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { Client, ProtocolManager__factory } from "../../../typechain";
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

    const Client = (await upgrades.deployProxy(ClientFactory, [
      client.kind,
      client.name,
      config.protocolManager,
      config.feeCollector,
      client.operators,
    ])) as Client;

    await Client.deployed();

    await Client.toggleWorkers(
      [
        "0xc4aD8CF7a5fcb75DeD1A33408B1b5645435b7290",
        "0x7395bD72A43950bEaD0c5458B2C06Db9697c05D3",
        "0xDcEfC7cEf2dD57be912A1406c38f45630e1A9788",
        "0x5C874ff89F367a6cc3Ef857D42f3e1eCCEA9A77B",
        "0x4556885dBCBD5397CB4FAB9602685F58da3A06d7",
        "0xf9aE649B797E25D38FBCdb47811cd3C7bf5872EE",
        "0x5D7E91c313992e6fC3715A31602D67926330a4a1",
        "0xB57275E202EA4395D6F129B2D285E031241c43bd",
        "0x49BE0A4Cc6599efD8dE8045aDDd1e4Fea5fe306a",
      ],
      true
    );

    const ProtocolManager = ProtocolManager__factory.connect(config.protocolManager, deployer);

    await ProtocolManager.approveClients([Client.address], true);

    logger(`  - Contract of ${client.name} deployed at ${Client.address}`);
  }
};

export default deployFun;
deployFun.tags = ["Client"];
