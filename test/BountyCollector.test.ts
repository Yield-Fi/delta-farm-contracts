import { ethers, upgrades, waffle } from "hardhat";

import BN from "bn.js";
import { BountyCollector } from "../typechain/BountyCollector";
import { BountyCollector__factory } from "../typechain/factories/BountyCollector__factory";
import { Client, MockToken, MockWBNB, ProtocolManager, Vault } from "../typechain";
import { Signer } from "ethers";
import chai from "chai";
import chainBn from "chai-bn";
import { deployProxyContract, deployToken, deployWBNB } from "./helpers";
import { solidity } from "ethereum-waffle";
import { deployVault } from "./helpers/deployVault";

chai.use(solidity);
chai.use(chainBn(BN));
const { expect } = chai;

describe("BountyCollector", async () => {
  // Bounty-related config
  let bountyToken: MockToken;
  let mockWBNB: MockWBNB;

  const BOUNTY_THRESHOLD = ethers.utils.parseEther("1");

  // Signers
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;

  // Addresses
  let deployerAddress: string;
  let aliceAddress: string;
  let bobAddress: string;

  let bountyCollector: BountyCollector;
  let protocolManager: ProtocolManager;
  let client: Client;
  let vault: Vault;

  // Signatures
  let bountyCollectorAsOkVault: BountyCollector;
  let bountyCollectorAsEvilVault: BountyCollector;
  let bountyCollectorAsOkCollector: BountyCollector;
  let bountyCollectorAsEvilCollector: BountyCollector;

  async function fixture() {
    [deployer, alice, bob] = await ethers.getSigners();
    [deployerAddress, aliceAddress, bobAddress] = await Promise.all([
      deployer.getAddress(),
      alice.getAddress(),
      bob.getAddress(),
    ]);
    // Bounty token
    // bountyToken = (await upgrades.deployProxy(
    //   await ethers.getContractFactory("MockToken", deployer),
    //   ["BountyToken", "BTT"]
    // )) as MockToken;
    // await bountyToken.deployed();

    // // Setup general protocol manager
    // protocolManager = (await deployProxyContract(
    //   "ProtocolManager",
    //   [[deployerAddress]],
    //   deployer
    // )) as ProtocolManager;
    // // Setup general protocol manager
    // bountyCollector = (await deployProxyContract(
    //   "BountyCollector",
    //   [bountyToken.address, "500", protocolManager.address],
    //   deployer
    // )) as BountyCollector;
    // // Client contract
    // client = (await deployProxyContract(
    //   "Client",
    //   ["Binance", "Binance Client", protocolManager.address, [deployerAddress]],
    //   deployer
    // )) as Client;
    // mockWBNB = await deployWBNB(deployer);
    // [vault] = await deployVault(
    //   mockWBNB,
    //   bountyToken,
    //   protocolManager.address,
    //   bountyCollector.address,
    //   deployerAddress,
    //   deployer
    // );
  }

  beforeEach(async () => {
    await fixture();
  });

  it("should respect access modifiers", async () => {});

  it("should revert the collect when amount is smaller than set threshold", async () => {});

  it("should register bounties and distribute them properly", async () => {});
});
