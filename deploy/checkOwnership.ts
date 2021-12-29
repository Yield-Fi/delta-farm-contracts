import { ethers } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import {
  Admin__factory,
  Client__factory,
  FeeCollector__factory,
  OwnableUpgradeSafe__factory,
  PancakeswapStrategyAddToPoolWithBaseToken__factory,
  PancakeswapStrategyAddToPoolWithoutBaseToken__factory,
  PancakeswapStrategyLiquidate__factory,
  PancakeswapWorker__factory,
  ProtocolManager__factory,
  Vault__factory,
  WrappedNativeTokenRelayer__factory,
} from "../typechain";

import { getConfig } from "./utils/config";
import dotenv from "dotenv";
dotenv.config();

const deployFunc: DeployFunction = async () => {
  const config = getConfig();
  const [deployer] = await ethers.getSigners();

  const walletToCompare = deployer.address.toLowerCase();
  console.log("Wallet addres to check: ", deployer.address);

  // Proxy admin owner
  if (!process.env.PROXY_ADMIN_ADDRESS) throw new Error("Not found PROXY_ADMIN_ADDRESS in .env");
  const proxyAdmin = OwnableUpgradeSafe__factory.connect(process.env.PROXY_ADMIN_ADDRESS, deployer);
  const proxyAdminOwner = await proxyAdmin.owner();
  console.log("ProxyAdmin->Owner", proxyAdminOwner.toLowerCase() === walletToCompare);

  const wrappedNativeTokenRelayer = WrappedNativeTokenRelayer__factory.connect(
    config.wrappedNativeTokenRelayer,
    deployer
  );

  const wrappedOwner = await wrappedNativeTokenRelayer.owner();
  console.log("wrappedNativeTokenRelayer->Owner", wrappedOwner.toLowerCase() === walletToCompare);
  // transferOwnership to change;

  const feeCollector = FeeCollector__factory.connect(config.feeCollector, deployer);

  const feeCollectorOwner = await feeCollector.owner();
  console.log("feeCollector->Owner", feeCollectorOwner.toLowerCase() === walletToCompare);

  // protocolManager
  const protocolManager = ProtocolManager__factory.connect(config.protocolManager, deployer);
  const protocolManagerOnwer = protocolManager.owner();
  console.log(
    "protocolManager->Owner",
    (await protocolManagerOnwer).toLowerCase() === walletToCompare
  );

  // adminContract
  const adminContract = Admin__factory.connect(config.adminContract, deployer);
  const adminContractOwner = await adminContract.owner();
  console.log("adminContract->Owner", adminContractOwner.toLowerCase() === walletToCompare);

  // strategy AddToPoolWithBaseToken
  const pancakeaddToPoolWithBaseTokenContract =
    PancakeswapStrategyAddToPoolWithBaseToken__factory.connect(
      config.strategies.pancakeswap.AddToPoolWithBaseToken,
      deployer
    );
  const pancakeAddToPoolWithBaseTokenOwner = await pancakeaddToPoolWithBaseTokenContract.owner();
  console.log(
    "PancakeswapStrategyAddToPoolWithBaseToken->Owner",
    pancakeAddToPoolWithBaseTokenOwner.toLowerCase() === walletToCompare
  );
  // strategy AddToPoolWithoutBaseToken
  const pancakeaddToPoolWithoutBaseTokenContract =
    PancakeswapStrategyAddToPoolWithoutBaseToken__factory.connect(
      config.strategies.pancakeswap.AddToPoolWithoutBaseToken,
      deployer
    );
  const pancakeAddToPoolWithoutBaseTokenOwner =
    await pancakeaddToPoolWithoutBaseTokenContract.owner();
  console.log(
    "PancakeswapStrategyAddToPoolWithoutBaseToken->Owner",
    pancakeAddToPoolWithoutBaseTokenOwner.toLowerCase() === walletToCompare
  );
  // strategy Liquidate
  const PancakeswapStrategyLiquidateContract = PancakeswapStrategyLiquidate__factory.connect(
    config.strategies.pancakeswap.Liquidate,
    deployer
  );
  const PancakeswapStrategyLiquidateOwner = await PancakeswapStrategyLiquidateContract.owner();
  console.log(
    "PancakeswapStrategyLiquidateOwner->Owner",
    PancakeswapStrategyLiquidateOwner.toLowerCase() === walletToCompare
  );

  // vaults
  for (const vault of config.vaults) {
    const v = Vault__factory.connect(vault.address, deployer);
    const vOwner = await v.owner();
    console.log(`${vault.name}->Vault->Owner`, vOwner.toLowerCase() === walletToCompare);

    // valuts worker
    for (const worker of vault.workers) {
      if (!worker.address) continue;

      const w = PancakeswapWorker__factory.connect(worker.address, deployer);
      const wOwner = await w.owner();
      console.log(
        `${worker.name}->PancakeswapWorker->Owner`,
        wOwner.toLowerCase() === walletToCompare
      );
    }
  }

  // clients
  for (const client of config.clients) {
    const c = Client__factory.connect(client.address, deployer);
    const cOwner = await c.owner();
    console.log(`${client.name}->${client.kind}->Owner`, cOwner.toLowerCase() === walletToCompare);
  }
};

export default deployFunc;
deployFunc.tags = ["checkOwnership"];
