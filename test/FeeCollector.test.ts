import { ethers, upgrades, waffle } from "hardhat";

import BN from "bn.js";
import {
  FeeCollector,
  FeeCollector__factory,
  MockToken,
  MockVault,
  ProtocolManager,
} from "../typechain";
import { Signer } from "ethers";
import chai from "chai";
import chainBn from "chai-bn";
import { deployContract, deployProxyContract, deployToken } from "./helpers";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
chai.use(chainBn(BN));
const { expect } = chai;

describe("FeeCollector", async () => {
  // Fee-related config
  let feeToken: MockToken;
  const BOUNTY_THRESHOLD = ethers.utils.parseEther("1");

  let ProtocolManager: ProtocolManager;
  let MockVault: MockVault;

  // Signers
  let deployer: Signer;
  let yieldFi: Signer;
  let bitterex: Signer;
  let evilVault: Signer;
  let evilCollector: Signer;

  // Addresses
  let deployerAddress: string;
  let yieldFiAddress: string;
  let bitterexAddress: string;
  let evilVaultAddress: string;

  let feeCollector: FeeCollector;

  // Signatures
  let feeCollectorAsEvilVault: FeeCollector;
  let feeCollectorAsYieldFi: FeeCollector;
  let feeCollectorAsBittirex: FeeCollector;
  let feeCollectorAsEvilCollector: FeeCollector;

  async function fixture() {
    [deployer, yieldFi, bitterex, evilVault, evilCollector] = await ethers.getSigners();

    [deployerAddress, yieldFiAddress, bitterexAddress, evilVaultAddress] = await Promise.all([
      deployer.getAddress(),
      yieldFi.getAddress(),
      bitterex.getAddress(),
      evilVault.getAddress(),
    ]);

    feeToken = await deployToken(
      {
        name: "Fee Token",
        symbol: "BTOKEN",
        holders: [
          { address: await deployer.getAddress(), amount: ethers.utils.parseEther("1000") },
        ],
      },
      deployer
    );

    MockVault = (await deployContract("MockVault", [feeToken.address], deployer)) as MockVault;

    ProtocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[deployerAddress, yieldFiAddress]],
      deployer
    )) as ProtocolManager;

    await ProtocolManager.approveClients([bitterexAddress], true);
    await ProtocolManager.approveVaults([MockVault.address], true);
    await ProtocolManager.whitelistOperators([deployerAddress], true);
    await ProtocolManager.approveAdminContract(yieldFiAddress);

    const FeeCollector = (await ethers.getContractFactory(
      "FeeCollector",
      deployer
    )) as FeeCollector__factory;
    feeCollector = (await upgrades.deployProxy(FeeCollector, [
      feeToken.address,
      BOUNTY_THRESHOLD,
      ProtocolManager.address,
    ])) as FeeCollector;

    await feeCollector.deployed();

    // Signatures
    feeCollectorAsEvilVault = feeCollector.connect(evilVault);
    feeCollectorAsYieldFi = feeCollector.connect(yieldFi);
    feeCollectorAsBittirex = feeCollector.connect(bitterex);
    feeCollectorAsEvilCollector = feeCollector.connect(evilCollector);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  it("should respect access modifiers", async () => {
    // Not whitelisted (evil) vault tries to register fee - revert
    await expect(
      feeCollectorAsEvilVault.registerFees([evilVaultAddress], [ethers.utils.parseEther("1")])
    ).to.be.revertedWith("FeeCollector: not approved vault");

    // Not whitelisted (evil) collector tries to collect fee - revert
    await expect(feeCollectorAsEvilCollector.collect()).to.be.revertedWith(
      "FeeCollector: not approved collector"
    );
  });

  it("should revert the collect when amount is smaller than set threshold", async () => {
    // Mint some tokens to simulate fees' harvested from reinvest-related event.
    await feeToken.mint(feeCollector.address, ethers.utils.parseEther("10"));

    // Register fees/shares as ok vault (0.5 below the threshold)
    await MockVault.executeTransaction(
      feeCollector.address,
      0,
      "registerFees(address[],uint256[])",
      ethers.utils.defaultAbiCoder.encode(
        ["address[]", "uint256[]"],
        [[yieldFiAddress], [ethers.utils.parseEther("0.5")]]
      )
    );

    await expect(feeCollectorAsYieldFi.collect()).to.be.revertedWith(
      "FeeCollector: fee amount too low"
    );
  });

  it("should register bounties and distribute them properly", async () => {
    // Mint some tokens to simulate fees' harvested from reinvest-related event.
    await feeToken.mint(feeCollector.address, ethers.utils.parseEther("10"));

    // Register fees/shares as ok vault
    await MockVault.executeTransaction(
      feeCollector.address,
      0,
      "registerFees(address[],uint256[])",
      ethers.utils.defaultAbiCoder.encode(
        ["address[]", "uint256[]"],
        [[yieldFiAddress], [ethers.utils.parseEther("9")]]
      )
    );

    await MockVault.executeTransaction(
      feeCollector.address,
      0,
      "registerFees(address[],uint256[])",
      ethers.utils.defaultAbiCoder.encode(
        ["address[]", "uint256[]"],
        [[bitterexAddress], [ethers.utils.parseEther("1")]]
      )
    );

    // Check the mint
    expect(await feeToken.balanceOf(feeCollector.address)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("10")
    );

    // Check if feeCollector has registered the fees (rewards)
    expect(await feeCollector.fees(yieldFiAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("9")
    );
    expect(await feeCollector.fees(bitterexAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("1")
    );

    /// Collects fee for the yieldFi
    // Call the collect as whitelisted collector
    await feeCollectorAsYieldFi.collect();

    expect(await feeCollector.fees(yieldFiAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("0")
    ); // 9 BT to claim - 9 BT collected = 0 BT left for yieldFi to collect
    expect(await feeToken.balanceOf(feeCollector.address)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("1")
    ); // 10 BT total - 9 BT reward = 1 BT left for bitterex
    expect(await feeToken.balanceOf(yieldFiAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("9")
    ); // 0 BT before + 9 BT collected = 9 BT total

    /// Collects fee for the bitterex
    // Call the collect as whitelisted collector
    await feeCollectorAsBittirex.collect();

    expect(await feeCollector.fees(bitterexAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("0")
    ); // 1 BT to claim - 1 BT collected = 0 BT left
    expect(await feeToken.balanceOf(feeCollector.address)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("0")
    ); // 1 BT total - 1 BT reward = 0 BT left
    expect(await feeToken.balanceOf(bitterexAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("1")
    ); // 0 BT before + 1 BT collected = 1 BT total
  });
});
