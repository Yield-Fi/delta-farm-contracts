import { EtherscanProvider } from "@ethersproject/providers";
import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { PancakeswapWorker } from "../../../typechain";
import { ProxyAdmin__factory } from "../../../typechain/factories/ProxyAdmin__factory";
import { getConfig } from "../../utils/config";
import { logger } from "../../utils/logger";

const MANUAL_IMPLEMENTATION_ADDRESS = "0xf281481977129002Aa0348F64fa649077cF5D983";
const PROXY_ADMIN_ADDRESS = "0x84a4e5606E54ccf25c9832Ae7Eb0d36F03cA6368";

const workersToReassignment = ["CAKE-WBNB Farm", "WBNB-BUSD Farm", "DAI-BUSD Farm"];

/**
 * MANUAL PROXY REASSIGNMENT
 * Date of issue: 05.02.2022
 * Date of resolve: 08.02.2022
 * Date of call: 08.02.2022
 * Description: OZ upgrades due the bsc provider error saved invalid proxy implementation address for three of all workers resulting in contract unupgradeability
 * Solution: Find the correct implementation address, pass it to the reassignment and perform manual reset
 * Disclaimer: Check the manifest file after issuing given script
 */
const upgradeFunc: DeployFunction = async () => {
  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  logger("--> Setting manual implementation for pancakeswap workers... <--");

  for (const vault of config.vaults) {
    for (const worker of vault.workers.filter((w) => workersToReassignment.includes(w.name))) {
      logger(`  -> Setting manual implementation address for ${worker.name}...`);
      try {
        const oldImplementationAddress = await upgrades.erc1967.getImplementationAddress(
          worker.address
        );

        const proxy = ProxyAdmin__factory.connect(PROXY_ADMIN_ADDRESS, deployer);

        await proxy.upgrade(worker.address, MANUAL_IMPLEMENTATION_ADDRESS);

        const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(
          worker.address
        );

        logger(
          `  New implementation of ${worker.name} has been change manually from ${oldImplementationAddress} to ${newImplementationAddress}`
        );
        logger(
          `  Success?: ${
            newImplementationAddress.toLowerCase() === MANUAL_IMPLEMENTATION_ADDRESS.toLowerCase()
          }`
        );
      } catch (e) {
        console.log(e);
      }
    }
  }

  logger(
    "--> Upgrading implementation of pancakeswap workers after manual reimplementation... <--"
  );

  for (const vault of config.vaults) {
    logger(`  -> Workers for ${vault.name}`);

    for (const worker of vault.workers) {
      logger(`  -> Upgrading ${worker.name}...`);
      try {
        const PancakeswapWorkerFactory = await ethers.getContractFactory(
          "PancakeswapWorker",
          deployer
        );

        const PancakeswapWorker = (await upgrades.upgradeProxy(
          worker.address,
          PancakeswapWorkerFactory
        )) as PancakeswapWorker;

        await PancakeswapWorker.deployed();

        logger(`  New implementation of ${worker.name} deployed at ${PancakeswapWorker.address}`);
      } catch (e) {
        console.error(e);
      }
    }
  }
};

export default upgradeFunc;
upgradeFunc.tags = ["PancakeManualImplementations"];
