"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@openzeppelin/test-helpers");
const typechain_1 = require("../typechain");
const hardhat_1 = require("hardhat");
const deployToken_1 = require("./helpers/deployToken");
const chai_1 = __importDefault(require("chai"));
const helpers_1 = require("./helpers");
const deployWorker_1 = require("./helpers/deployWorker");
const deployVault_1 = require("./helpers/deployVault");
const ethereum_waffle_1 = require("ethereum-waffle");
chai_1.default.use(ethereum_waffle_1.solidity);
const { expect } = chai_1.default;
describe("ProtocolManager", async () => {
    const CAKE_REWARD_PER_BLOCK = hardhat_1.ethers.utils.parseEther("0.076");
    const POOL_ID = 1;
    const REINVEST_BOUNTY_BPS = "100";
    // DEX (PCS)
    let factory;
    let router;
    let masterChef;
    let pancakeswapWorker01;
    let pancakeswapWorker02;
    let lp;
    let mockWBNB;
    // Tokens
    let baseToken;
    let targetToken;
    let cake;
    // BC
    let feeCollector;
    // Client
    let exampleClient;
    // Signers
    let deployer;
    let evilUser;
    let clientOperator;
    let deployerAddress;
    let clientOperatorAddress;
    // Protocol
    let vault;
    // Connected entities (signer to target entity)
    let protocolManager;
    let protocolManagerAsEvilUser;
    async function fixture() {
        [deployer, evilUser, clientOperator] = await hardhat_1.ethers.getSigners();
        deployerAddress = await deployer.getAddress();
        clientOperatorAddress = await clientOperator.getAddress();
        baseToken = await (0, deployToken_1.deployToken)({
            name: "BASETOKEN",
            symbol: "BTOKEN",
            holders: [{ address: deployerAddress, amount: hardhat_1.ethers.utils.parseEther("1000") }],
        }, deployer);
        targetToken = await (0, deployToken_1.deployToken)({
            name: "TARGETTOKEN",
            symbol: "TTOKEN",
            holders: [{ address: deployerAddress, amount: hardhat_1.ethers.utils.parseEther("1000") }],
        }, deployer);
        mockWBNB = await (0, deployToken_1.deployWBNB)(deployer);
        [factory, router, cake, , masterChef] = await (0, helpers_1.deployPancakeV2)(mockWBNB, CAKE_REWARD_PER_BLOCK, [{ address: deployerAddress, amount: hardhat_1.ethers.utils.parseEther("100") }], deployer);
        protocolManager = (await (0, helpers_1.deployProxyContract)("ProtocolManager", [[deployerAddress]], deployer));
        feeCollector = (await (0, helpers_1.deployProxyContract)("FeeCollector", [baseToken.address, "500", protocolManager.address], deployer));
        // Treasury acc = yieldFi protocol owner
        [vault] = await (0, deployVault_1.deployVault)(mockWBNB, baseToken, protocolManager.address, feeCollector.address, deployerAddress, deployer);
        // Setup BTOKEN-FTOKEN pair on Pancakeswap
        // Add lp to masterChef's pool
        await factory.createPair(baseToken.address, targetToken.address);
        lp = typechain_1.PancakePair__factory.connect(await factory.getPair(targetToken.address, baseToken.address), deployer);
        await masterChef.add(1, lp.address, true);
        /// Setup PancakeswapWorker
        pancakeswapWorker01 = await (0, deployWorker_1.deployPancakeWorker)(vault, "pancakeswapWorker01", baseToken, masterChef, router, POOL_ID, [cake.address, mockWBNB.address, baseToken.address], 0, REINVEST_BOUNTY_BPS, protocolManager.address, deployer);
        pancakeswapWorker02 = await (0, deployWorker_1.deployPancakeWorker)(vault, "pancakeswapWorker02", baseToken, masterChef, router, POOL_ID, [cake.address, mockWBNB.address, baseToken.address], 0, REINVEST_BOUNTY_BPS, protocolManager.address, deployer);
        // Clients
        exampleClient = (await (0, helpers_1.deployProxyContract)("Client", [
            "Binance",
            "Binance Client",
            protocolManager.address,
            feeCollector.address,
            [clientOperatorAddress],
            [hardhat_1.ethers.constants.AddressZero], // Additional withdrawer
        ], deployer));
        protocolManagerAsEvilUser = protocolManager.connect(evilUser);
    }
    beforeEach(async () => {
        await hardhat_1.waffle.loadFixture(fixture);
    });
    context("client contracts approval", async () => {
        it("should manage client contract's approval", async () => {
            await protocolManager.approveClients([exampleClient.address], true);
            expect(await protocolManager.approvedClients(exampleClient.address)).to.be.eq(true);
            await protocolManager.approveClients([exampleClient.address], false);
            expect(await protocolManager.approvedClients(exampleClient.address)).to.be.eq(false);
        });
    });
    context("called by whitelisted operator", async () => {
        it("should add new worker properly", async () => {
            await protocolManager.approveWorkers([pancakeswapWorker01.address], true);
            expect(await protocolManager.approvedWorkers(pancakeswapWorker01.address)).to.be.eql(true);
        });
        /**
         * @notice No matter by which method worker has been added.
         */
        it("should remove worker from the register", async () => {
            await protocolManager.approveWorkers([pancakeswapWorker01.address], true);
            // Check if set properly
            expect(await protocolManager.approvedWorkers(pancakeswapWorker01.address)).to.be.eql(true);
            await protocolManager.approveWorkers([pancakeswapWorker01.address], false);
            expect(await protocolManager.approvedWorkers(pancakeswapWorker01.address)).to.be.eql(false);
        });
        it("should approve and remove new vault properly including token-to-vault mapping", async () => {
            // Addition
            await protocolManager.approveVaults([vault.address], true);
            expect(await protocolManager.approvedVaults(vault.address)).to.be.eq(true);
            expect(await protocolManager.tokenToVault(await vault.token())).to.be.eql(vault.address);
            // Removal
            await protocolManager.approveVaults([vault.address], false);
            expect(await protocolManager.approvedVaults(vault.address)).to.be.eq(false);
            expect(await protocolManager.tokenToVault(await vault.token())).to.be.eql(hardhat_1.ethers.constants.AddressZero);
        });
    });
    context("called by not whitelisted operator", async () => {
        it("should revert upon worker addition", async () => {
            await expect(protocolManagerAsEvilUser.approveWorkers([pancakeswapWorker01.address], true)).to.be.revertedWith("ProtocolManager: Operator not whitelisted");
        });
        /**
         * @notice No matter by which method worker has been added.
         */
        it("should revert upon worker removal", async () => {
            await protocolManager.approveWorkers([pancakeswapWorker01.address], true);
            // Check if set properly
            expect(await protocolManager.approvedWorkers(pancakeswapWorker01.address)).to.be.eql(true);
            await expect(protocolManagerAsEvilUser.approveWorkers([pancakeswapWorker01.address], false)).to.be.revertedWith("ProtocolManager: Operator not whitelisted");
        });
    });
});
