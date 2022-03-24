"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployVault = void 0;
const hardhat_1 = require("hardhat");
const deployVault = async (mockBNB, baseToken, protocolManagerAddress, bountyCollectorAddress, treasuryAccountAddress, deployer) => {
    const WNativeRelayer = (await hardhat_1.ethers.getContractFactory("WrappedNativeTokenRelayer", deployer));
    const wNativeRelayer = await hardhat_1.upgrades.deployProxy(WNativeRelayer, [mockBNB.address]);
    await wNativeRelayer.deployed();
    const VaultConfig = (await hardhat_1.ethers.getContractFactory("VaultConfig", deployer));
    const vaultConfig = (await hardhat_1.upgrades.deployProxy(VaultConfig, [
        mockBNB.address,
        wNativeRelayer.address,
        treasuryAccountAddress,
    ]));
    await vaultConfig.deployed();
    const Vault = (await hardhat_1.ethers.getContractFactory("Vault", deployer));
    const vault = (await hardhat_1.upgrades.deployProxy(Vault, [
        vaultConfig.address,
        baseToken.address,
        protocolManagerAddress,
        bountyCollectorAddress,
    ]));
    await vault.deployed();
    return [vault, vaultConfig, wNativeRelayer];
};
exports.deployVault = deployVault;
