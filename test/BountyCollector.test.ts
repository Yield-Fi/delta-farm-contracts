import { ethers, upgrades, waffle } from "hardhat";

import BN from "bn.js";
import { BountyCollector } from "../typechain/BountyCollector";
import { BountyCollector__factory } from "../typechain/factories/BountyCollector__factory";
import { MockToken } from "../typechain";
import { Signer } from "ethers";
import chai from "chai";
import chainBn from "chai-bn";
import { deployToken } from "./helpers";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
chai.use(chainBn(BN));
const { expect } = chai;

describe("BountyCollector", async () => {
  // Bounty-related config
  let bountyToken: MockToken;
  const BOUNTY_THRESHOLD = ethers.utils.parseEther("1");

  // Signers
  let deployer: Signer;
  let yieldFi: Signer;
  let bitterex: Signer;
  let okVault: Signer;
  let evilVault: Signer;
  let okCollector: Signer;
  let evilCollector: Signer;

  // Addresses
  let yieldFiAddress: string;
  let bitterexAddress: string;
  let evilVaultAddress: string;

  let bountyCollector: BountyCollector;

  // Signatures
  let bountyCollectorAsOkVault: BountyCollector;
  let bountyCollectorAsEvilVault: BountyCollector;
  let bountyCollectorAsOkCollector: BountyCollector;
  let bountyCollectorAsEvilCollector: BountyCollector;

  async function fixture() {
    [deployer, yieldFi, bitterex, okVault, evilVault, okCollector, evilCollector] =
      await ethers.getSigners();

    [yieldFiAddress, bitterexAddress, evilVaultAddress] = await Promise.all([
      yieldFi.getAddress(),
      bitterex.getAddress(),
      evilVault.getAddress(),
    ]);

    bountyToken = await deployToken(
      {
        name: "Bounty Token",
        symbol: "BTOKEN",
        holders: [
          { address: await deployer.getAddress(), amount: ethers.utils.parseEther("1000") },
        ],
      },
      deployer
    );

    const BountyCollector = (await ethers.getContractFactory(
      "BountyCollector",
      deployer
    )) as BountyCollector__factory;
    bountyCollector = (await upgrades.deployProxy(BountyCollector, [
      bountyToken.address,
      BOUNTY_THRESHOLD,
    ])) as BountyCollector;

    await bountyCollector.deployed();

    // Whitelist collector and vault
    await bountyCollector.whitelistCollectors([await okCollector.getAddress()], true);
    await bountyCollector.whitelistVaults([await okVault.getAddress()], true);

    // Signatures
    bountyCollectorAsOkVault = bountyCollector.connect(okVault);
    bountyCollectorAsEvilVault = bountyCollector.connect(evilVault);
    bountyCollectorAsOkCollector = bountyCollector.connect(okCollector);
    bountyCollectorAsEvilCollector = bountyCollector.connect(evilCollector);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  it("should respect access modifiers", async () => {
    // Not whitelisted (evil) vault tries to register bounty - revert
    await expect(
      bountyCollectorAsEvilVault.registerBounties(
        [evilVaultAddress],
        [ethers.utils.parseEther("1")]
      )
    ).to.be.revertedWith("YieldFi BountyCollector::VaultNotWhitelisted");

    // Not whitelisted (evil) collector tries to collect bounty - revert
    await expect(
      bountyCollectorAsEvilCollector.collect(ethers.constants.AddressZero)
    ).to.be.revertedWith("YieldFi BountyCollector::CollectorNotWhitelisted");
  });

  it("should revert the collect when amount is smaller than set threshold", async () => {
    // Mint some tokens to simulate fees' harvested from reinvest-related event.
    await bountyToken.mint(bountyCollector.address, ethers.utils.parseEther("10"));

    // Register fees/shares as ok vault (0.5 below the threshold)
    await bountyCollectorAsOkVault.registerBounties(
      [yieldFiAddress],
      [ethers.utils.parseEther("0.5")]
    );

    await expect(bountyCollectorAsOkCollector.collect(yieldFiAddress)).to.be.revertedWith(
      "YieldFi BountyCollector::BountyAmountTooLow"
    );
  });

  it("should register bounties and distribute them properly", async () => {
    // Mint some tokens to simulate fees' harvested from reinvest-related event.
    await bountyToken.mint(bountyCollector.address, ethers.utils.parseEther("10"));

    // Register fees/shares as ok vault
    await bountyCollectorAsOkVault.registerBounties(
      [yieldFiAddress],
      [ethers.utils.parseEther("9")]
    );
    await bountyCollectorAsOkVault.registerBounties(
      [bitterexAddress],
      [ethers.utils.parseEther("1")]
    );

    // Check the mint
    expect(await bountyToken.balanceOf(bountyCollector.address)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("10")
    );

    // Check if bountyCollector has registered the fees (rewards)
    expect(await bountyCollector.bounties(yieldFiAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("9")
    );
    expect(await bountyCollector.bounties(bitterexAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("1")
    );

    /// Collects fee for the yieldFi
    // Call the collect as whitelisted collector
    await bountyCollectorAsOkCollector.collect(yieldFiAddress);

    expect(await bountyCollector.bounties(yieldFiAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("0")
    ); // 9 BT to claim - 9 BT collected = 0 BT left for yieldFi to collect
    expect(await bountyToken.balanceOf(bountyCollector.address)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("1")
    ); // 10 BT total - 9 BT reward = 1 BT left for bitterex
    expect(await bountyToken.balanceOf(yieldFiAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("9")
    ); // 0 BT before + 9 BT collected = 9 BT total

    /// Collects fee for the bitterex
    // Call the collect as whitelisted collector
    await bountyCollectorAsOkCollector.collect(bitterexAddress);

    expect(await bountyCollector.bounties(bitterexAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("0")
    ); // 1 BT to claim - 1 BT collected = 0 BT left
    expect(await bountyToken.balanceOf(bountyCollector.address)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("0")
    ); // 1 BT total - 1 BT reward = 0 BT left
    expect(await bountyToken.balanceOf(bitterexAddress)).to.be.a.bignumber.that.is.eql(
      ethers.utils.parseEther("1")
    ); // 0 BT before + 1 BT collected = 1 BT total
  });
});
