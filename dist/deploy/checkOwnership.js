"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const typechain_1 = require("../typechain");
const config_1 = require("./utils/config");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const deployFunc = async () => {
    const config = (0, config_1.getConfig)();
    const [deployer] = await hardhat_1.ethers.getSigners();
    const walletToCompare = deployer.address.toLowerCase();
    console.log("Wallet addres to check: ", deployer.address);
    // Proxy admin owner
    if (!process.env.PROXY_ADMIN_ADDRESS)
        throw new Error("Not found PROXY_ADMIN_ADDRESS in .env");
    const proxyAdmin = typechain_1.OwnableUpgradeSafe__factory.connect(process.env.PROXY_ADMIN_ADDRESS, deployer);
    const proxyAdminOwner = await proxyAdmin.owner();
    console.log("ProxyAdmin->Owner", proxyAdminOwner.toLowerCase() === walletToCompare);
    const wrappedNativeTokenRelayer = typechain_1.WrappedNativeTokenRelayer__factory.connect(config.wrappedNativeTokenRelayer, deployer);
    const wrappedOwner = await wrappedNativeTokenRelayer.owner();
    console.log("wrappedNativeTokenRelayer->Owner", wrappedOwner.toLowerCase() === walletToCompare);
    // transferOwnership to change;
    const feeCollector = typechain_1.FeeCollector__factory.connect(config.feeCollector, deployer);
    const feeCollectorOwner = await feeCollector.owner();
    console.log("feeCollector->Owner", feeCollectorOwner.toLowerCase() === walletToCompare);
    // protocolManager
    const protocolManager = typechain_1.ProtocolManager__factory.connect(config.protocolManager, deployer);
    const protocolManagerOnwer = protocolManager.owner();
    console.log("protocolManager->Owner", (await protocolManagerOnwer).toLowerCase() === walletToCompare);
    // adminContract
    const adminContract = typechain_1.Admin__factory.connect(config.adminContract, deployer);
    const adminContractOwner = await adminContract.owner();
    console.log("adminContract->Owner", adminContractOwner.toLowerCase() === walletToCompare);
    // strategy AddToPoolWithBaseToken
    const pancakeaddToPoolWithBaseTokenContract = typechain_1.PancakeswapStrategyAddToPoolWithBaseToken__factory.connect(config.strategies.pancakeswap.AddToPoolWithBaseToken, deployer);
    const pancakeAddToPoolWithBaseTokenOwner = await pancakeaddToPoolWithBaseTokenContract.owner();
    console.log("PancakeswapStrategyAddToPoolWithBaseToken->Owner", pancakeAddToPoolWithBaseTokenOwner.toLowerCase() === walletToCompare);
    // strategy AddToPoolWithoutBaseToken
    const pancakeaddToPoolWithoutBaseTokenContract = typechain_1.PancakeswapStrategyAddToPoolWithoutBaseToken__factory.connect(config.strategies.pancakeswap.AddToPoolWithoutBaseToken, deployer);
    const pancakeAddToPoolWithoutBaseTokenOwner = await pancakeaddToPoolWithoutBaseTokenContract.owner();
    console.log("PancakeswapStrategyAddToPoolWithoutBaseToken->Owner", pancakeAddToPoolWithoutBaseTokenOwner.toLowerCase() === walletToCompare);
    // strategy Liquidate
    const PancakeswapStrategyLiquidateContract = typechain_1.PancakeswapStrategyLiquidate__factory.connect(config.strategies.pancakeswap.Liquidate, deployer);
    const PancakeswapStrategyLiquidateOwner = await PancakeswapStrategyLiquidateContract.owner();
    console.log("PancakeswapStrategyLiquidateOwner->Owner", PancakeswapStrategyLiquidateOwner.toLowerCase() === walletToCompare);
    // vaults
    for (const vault of config.vaults) {
        const v = typechain_1.Vault__factory.connect(vault.address, deployer);
        const vOwner = await v.owner();
        console.log(`${vault.name}->Vault->Owner`, vOwner.toLowerCase() === walletToCompare);
        // valuts worker
        for (const worker of vault.workers) {
            if (!worker.address)
                continue;
            const w = typechain_1.PancakeswapWorker__factory.connect(worker.address, deployer);
            const wOwner = await w.owner();
            console.log(`${worker.name}->PancakeswapWorker->Owner`, wOwner.toLowerCase() === walletToCompare);
        }
    }
    // clients
    for (const client of config.clients) {
        const c = typechain_1.Client__factory.connect(client.address, deployer);
        const cOwner = await c.owner();
        console.log(`${client.name}->${client.kind}->Owner`, cOwner.toLowerCase() === walletToCompare);
    }
};
exports.default = deployFunc;
deployFunc.tags = ["checkOwnership"];
