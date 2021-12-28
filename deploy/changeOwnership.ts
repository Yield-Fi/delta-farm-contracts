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

  // // Proxy admin owner
  if (!process.env.NEW_OWNER_ADDRESS) throw new Error("Not found NEW_OWNER_ADDRESS in .env");
  if (!process.env.PROXY_ADMIN_ADDRESS) throw new Error("Not found PROXY_ADMIN_ADDRESS in .env");

  const newOwner = process.env.NEW_OWNER_ADDRESS;
  let transferOwnership;

  const proxyAdmin = OwnableUpgradeSafe__factory.connect(process.env.PROXY_ADMIN_ADDRESS, deployer);
  const proxyAdminOwner = await proxyAdmin.owner();
  console.log("ProxyAdmin->transferOwnership", proxyAdminOwner, "->", newOwner);
  if (deployer.address.toLowerCase() === proxyAdminOwner.toLowerCase()) {
    transferOwnership = await proxyAdmin.transferOwnership(newOwner);
    console.log("ProxyAdmin->transferOwnership->hash", transferOwnership.hash);
  } else console.log("ProxyAdmin->transferOwnership", "SKIP");

  const wrappedNativeTokenRelayer = WrappedNativeTokenRelayer__factory.connect(
    config.wrappedNativeTokenRelayer,
    deployer
  );
  const wrappedOwner = await wrappedNativeTokenRelayer.owner();
  console.log("wrappedNativeTokenRelayer->transferOwnership", wrappedOwner, "->", newOwner);
  if (deployer.address.toLowerCase() === wrappedOwner.toLowerCase()) {
    transferOwnership = await wrappedNativeTokenRelayer.transferOwnership(newOwner);
    console.log("wrappedNativeTokenRelayer->transferOwnership->hash", transferOwnership.hash);
  } else console.log("wrappedNativeTokenRelayer->transferOwnership", "SKIP");

  const feeCollector = FeeCollector__factory.connect(config.feeCollector, deployer);

  const feeCollectorOwner = await feeCollector.owner();
  console.log("feeCollector->transferOwnership", feeCollectorOwner, "->", newOwner);
  if (deployer.address.toLowerCase() === feeCollectorOwner.toLowerCase()) {
    transferOwnership = await feeCollector.transferOwnership(newOwner);
    console.log("feeCollector->transferOwnership->hash", transferOwnership.hash);
  } else console.log("feeCollector->transferOwnership", "SKIP");

  // protocolManager
  const protocolManager = ProtocolManager__factory.connect(config.protocolManager, deployer);
  const protocolManagerOnwer = await protocolManager.owner();
  console.log("protocolManager->transferOwnership", protocolManagerOnwer, "->", newOwner);
  if (deployer.address.toLowerCase() === protocolManagerOnwer.toLowerCase()) {
    transferOwnership = await protocolManager.transferOwnership(newOwner);
    console.log("protocolManager->transferOwnership->hash", transferOwnership.hash);
  } else console.log("protocolManager->transferOwnership", "SKIP");

  // adminContract
  const adminContract = Admin__factory.connect(config.adminContract, deployer);
  const adminContractOwner = await adminContract.owner();
  console.log("adminContract->transferOwnership", adminContractOwner, "->", newOwner);
  if (deployer.address.toLowerCase() === adminContractOwner.toLowerCase()) {
    transferOwnership = await adminContract.transferOwnership(newOwner);
    console.log("adminContract->transferOwnership->hash", transferOwnership.hash);
  } else console.log("adminContract->transferOwnership", "SKIP");

  // strategy AddToPoolWithBaseToken
  const pancakeaddToPoolWithBaseTokenContract =
    PancakeswapStrategyAddToPoolWithBaseToken__factory.connect(
      config.strategies.pancakeswap.AddToPoolWithBaseToken,
      deployer
    );
  const pancakeAddToPoolWithBaseTokenOwner = await pancakeaddToPoolWithBaseTokenContract.owner();
  console.log(
    "PancakeswapStrategyAddToPoolWithBaseToken->transferOwnership",
    pancakeAddToPoolWithBaseTokenOwner,
    "->",
    newOwner
  );
  if (deployer.address.toLowerCase() === pancakeAddToPoolWithBaseTokenOwner.toLowerCase()) {
    transferOwnership = await pancakeaddToPoolWithBaseTokenContract.transferOwnership(newOwner);
    console.log(
      "PancakeswapStrategyAddToPoolWithBaseToken->transferOwnership->hash",
      transferOwnership.hash
    );
  } else console.log("PancakeswapStrategyAddToPoolWithBaseToken->transferOwnership", "SKIP");
  // strategy AddToPoolWithoutBaseToken
  const pancakeaddToPoolWithoutBaseTokenContract =
    PancakeswapStrategyAddToPoolWithoutBaseToken__factory.connect(
      config.strategies.pancakeswap.AddToPoolWithoutBaseToken,
      deployer
    );
  const pancakeAddToPoolWithoutBaseTokenOwner =
    await pancakeaddToPoolWithoutBaseTokenContract.owner();
  console.log(
    "PancakeswapStrategyAddToPoolWithoutBaseToken->transferOwnership",
    pancakeAddToPoolWithoutBaseTokenOwner,
    "->",
    newOwner
  );
  if (deployer.address.toLowerCase() === pancakeAddToPoolWithoutBaseTokenOwner.toLowerCase()) {
    transferOwnership = await pancakeaddToPoolWithoutBaseTokenContract.transferOwnership(newOwner);
    console.log(
      "PancakeswapStrategyAddToPoolWithoutBaseToken->transferOwnership->hash",
      transferOwnership.hash
    );
  } else console.log("PancakeswapStrategyAddToPoolWithoutBaseToken->transferOwnership", "SKIP");
  // strategy Liquidate
  const PancakeswapStrategyLiquidateContract = PancakeswapStrategyLiquidate__factory.connect(
    config.strategies.pancakeswap.Liquidate,
    deployer
  );
  const PancakeswapStrategyLiquidateOwner = await PancakeswapStrategyLiquidateContract.owner();
  console.log(
    "PancakeswapStrategyLiquidateOwner->transferOwnership",
    PancakeswapStrategyLiquidateOwner,
    "->",
    newOwner
  );
  if (deployer.address.toLowerCase() === PancakeswapStrategyLiquidateOwner.toLowerCase()) {
    transferOwnership = await PancakeswapStrategyLiquidateContract.transferOwnership(newOwner);
    console.log(
      "PancakeswapStrategyLiquidateOwner->transferOwnership->hash",
      transferOwnership.hash
    );
  } else console.log("PancakeswapStrategyLiquidateOwner->transferOwnership", "SKIP");

  // vaults
  for (const vault of config.vaults) {
    const v = Vault__factory.connect(vault.address, deployer);
    const vOwner = await v.owner();
    console.log(`${vault.name}->Vault->transferOwnership`, vOwner, "->", newOwner);
    if (deployer.address.toLowerCase() === vOwner.toLowerCase()) {
      transferOwnership = await v.transferOwnership(newOwner);
      console.log(`${vault.name}->Vault->transferOwnership->hash`, transferOwnership.hash);
    } else console.log(`${vault.name}->Vault->transferOwnership`, "SKIP");

    // valuts worker
    for (const worker of vault.workers) {
      if (worker.name.includes("PancakeswapWorker")) {
        const w = PancakeswapWorker__factory.connect(worker.address, deployer);
        const wOwner = await w.owner();
        console.log(`${worker.name}->PancakeswapWorker->transferOwnership`, wOwner, "->", newOwner);
        if (deployer.address.toLowerCase() === wOwner.toLowerCase()) {
          transferOwnership = await w.transferOwnership(newOwner);
          console.log(
            `${worker.name}->PancakeswapWorker->transferOwnership->hash`,
            transferOwnership.hash
          );
        } else console.log(`${worker.name}->PancakeswapWorker->transferOwnership`, "SKIP");
      }
    }
  }

  // clients
  for (const client of config.clients) {
    const c = Client__factory.connect(client.address, deployer);
    const cOwner = await c.owner();
    console.log(`${client.name}->${client.kind}->transferOwnership`, cOwner, "->", newOwner);
    if (deployer.address.toLowerCase() === cOwner.toLowerCase()) {
      transferOwnership = await c.transferOwnership(newOwner);
      console.log(
        `${client.name}->${client.kind}->transferOwnership->hash`,
        transferOwnership.hash
      );
    } else console.log(`${client.name}->${client.kind}->transferOwnership`, "SKIP");
  }
};

export default deployFunc;
deployFunc.tags = ["changeOwnership"];
