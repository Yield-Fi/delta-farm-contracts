"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const bn_js_1 = __importDefault(require("bn.js"));
const chai_1 = __importDefault(require("chai"));
const chai_bn_1 = __importDefault(require("chai-bn"));
const helpers_1 = require("./helpers");
const ethereum_waffle_1 = require("ethereum-waffle");
chai_1.default.use(ethereum_waffle_1.solidity);
chai_1.default.use((0, chai_bn_1.default)(bn_js_1.default));
const { expect } = chai_1.default;
describe("FeeCollector", async () => {
    // Fee-related config
    let feeToken;
    const BOUNTY_THRESHOLD = hardhat_1.ethers.utils.parseEther("1");
    let ProtocolManager;
    let MockVault;
    // Signers
    let deployer;
    let yieldFi;
    let bitterex;
    let evilVault;
    let evilCollector;
    // Addresses
    let deployerAddress;
    let yieldFiAddress;
    let bitterexAddress;
    let evilVaultAddress;
    let feeCollector;
    // Signatures
    let feeCollectorAsEvilVault;
    let feeCollectorAsYieldFi;
    let feeCollectorAsBittirex;
    let feeCollectorAsEvilCollector;
    async function fixture() {
        [deployer, yieldFi, bitterex, evilVault, evilCollector] = await hardhat_1.ethers.getSigners();
        [deployerAddress, yieldFiAddress, bitterexAddress, evilVaultAddress] = await Promise.all([
            deployer.getAddress(),
            yieldFi.getAddress(),
            bitterex.getAddress(),
            evilVault.getAddress(),
        ]);
        feeToken = await (0, helpers_1.deployToken)({
            name: "Fee Token",
            symbol: "BTOKEN",
            holders: [
                { address: await deployer.getAddress(), amount: hardhat_1.ethers.utils.parseEther("1000") },
            ],
        }, deployer);
        MockVault = (await (0, helpers_1.deployContract)("MockVault", [feeToken.address], deployer));
        ProtocolManager = (await (0, helpers_1.deployProxyContract)("ProtocolManager", [[deployerAddress, yieldFiAddress]], deployer));
        await ProtocolManager.approveClients([bitterexAddress], true);
        await ProtocolManager.approveVaults([MockVault.address], true);
        await ProtocolManager.whitelistOperators([deployerAddress], true);
        await ProtocolManager.approveAdminContract(yieldFiAddress);
        const FeeCollector = (await hardhat_1.ethers.getContractFactory("FeeCollector", deployer));
        feeCollector = (await hardhat_1.upgrades.deployProxy(FeeCollector, [
            feeToken.address,
            BOUNTY_THRESHOLD,
            ProtocolManager.address,
        ]));
        await feeCollector.deployed();
        // Signatures
        feeCollectorAsEvilVault = feeCollector.connect(evilVault);
        feeCollectorAsYieldFi = feeCollector.connect(yieldFi);
        feeCollectorAsBittirex = feeCollector.connect(bitterex);
        feeCollectorAsEvilCollector = feeCollector.connect(evilCollector);
    }
    beforeEach(async () => {
        await hardhat_1.waffle.loadFixture(fixture);
    });
    it("should respect access modifiers", async () => {
        // Not whitelisted (evil) vault tries to register fee - revert
        await expect(feeCollectorAsEvilVault.registerFees([evilVaultAddress], [hardhat_1.ethers.utils.parseEther("1")])).to.be.revertedWith("FeeCollector: not approved vault");
        // Not whitelisted (evil) collector tries to collect fee - revert
        await expect(feeCollectorAsEvilCollector.collect()).to.be.revertedWith("FeeCollector: not approved collector");
    });
    it("should revert the collect when amount is smaller than set threshold", async () => {
        // Mint some tokens to simulate fees' harvested from reinvest-related event.
        await feeToken.mint(feeCollector.address, hardhat_1.ethers.utils.parseEther("10"));
        // Register fees/shares as ok vault (0.5 below the threshold)
        await MockVault.executeTransaction(feeCollector.address, 0, "registerFees(address[],uint256[])", hardhat_1.ethers.utils.defaultAbiCoder.encode(["address[]", "uint256[]"], [[yieldFiAddress], [hardhat_1.ethers.utils.parseEther("0.5")]]));
        await expect(feeCollectorAsYieldFi.collect()).to.be.revertedWith("FeeCollector: fee amount too low");
    });
    it("should register bounties and distribute them properly", async () => {
        // Mint some tokens to simulate fees' harvested from reinvest-related event.
        await feeToken.mint(feeCollector.address, hardhat_1.ethers.utils.parseEther("10"));
        // Register fees/shares as ok vault
        await MockVault.executeTransaction(feeCollector.address, 0, "registerFees(address[],uint256[])", hardhat_1.ethers.utils.defaultAbiCoder.encode(["address[]", "uint256[]"], [[yieldFiAddress], [hardhat_1.ethers.utils.parseEther("9")]]));
        await MockVault.executeTransaction(feeCollector.address, 0, "registerFees(address[],uint256[])", hardhat_1.ethers.utils.defaultAbiCoder.encode(["address[]", "uint256[]"], [[bitterexAddress], [hardhat_1.ethers.utils.parseEther("1")]]));
        // Check the mint
        expect(await feeToken.balanceOf(feeCollector.address)).to.be.a.bignumber.that.is.eql(hardhat_1.ethers.utils.parseEther("10"));
        // Check if feeCollector has registered the fees (rewards)
        expect(await feeCollector.fees(yieldFiAddress)).to.be.a.bignumber.that.is.eql(hardhat_1.ethers.utils.parseEther("9"));
        expect(await feeCollector.fees(bitterexAddress)).to.be.a.bignumber.that.is.eql(hardhat_1.ethers.utils.parseEther("1"));
        /// Collects fee for the yieldFi
        // Call the collect as whitelisted collector
        await feeCollectorAsYieldFi.collect();
        expect(await feeCollector.fees(yieldFiAddress)).to.be.a.bignumber.that.is.eql(hardhat_1.ethers.utils.parseEther("0")); // 9 BT to claim - 9 BT collected = 0 BT left for yieldFi to collect
        expect(await feeToken.balanceOf(feeCollector.address)).to.be.a.bignumber.that.is.eql(hardhat_1.ethers.utils.parseEther("1")); // 10 BT total - 9 BT reward = 1 BT left for bitterex
        expect(await feeToken.balanceOf(yieldFiAddress)).to.be.a.bignumber.that.is.eql(hardhat_1.ethers.utils.parseEther("9")); // 0 BT before + 9 BT collected = 9 BT total
        /// Collects fee for the bitterex
        // Call the collect as whitelisted collector
        await feeCollectorAsBittirex.collect();
        expect(await feeCollector.fees(bitterexAddress)).to.be.a.bignumber.that.is.eql(hardhat_1.ethers.utils.parseEther("0")); // 1 BT to claim - 1 BT collected = 0 BT left
        expect(await feeToken.balanceOf(feeCollector.address)).to.be.a.bignumber.that.is.eql(hardhat_1.ethers.utils.parseEther("0")); // 1 BT total - 1 BT reward = 0 BT left
        expect(await feeToken.balanceOf(bitterexAddress)).to.be.a.bignumber.that.is.eql(hardhat_1.ethers.utils.parseEther("1")); // 0 BT before + 1 BT collected = 1 BT total
    });
});
