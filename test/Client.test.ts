import "@openzeppelin/test-helpers";

import { BigNumber, Signer } from "ethers";
import {
  CakeToken,
  FeeCollector,
  MockWBNB,
  PancakeFactory,
  PancakeMasterChef,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  SyrupBar,
  Vault,
  VaultConfig,
  Client,
  PancakeswapStrategyAddToPoolWithBaseToken,
  PancakeswapStrategyAddToPoolWithoutBaseToken,
  ProtocolManager,
} from "../typechain";
import { ethers, waffle } from "hardhat";
import { deployToken, deployWBNB } from "./helpers/deployToken";

import { MockToken } from "../typechain/MockToken";
import { PancakeswapStrategyLiquidate } from "../typechain/PancakeswapStrategyLiquidate";
import { PancakeswapWorker } from "../typechain/PancakeswapWorker";
import { SwapHelper } from "./helpers/swap";
import chai from "chai";
import { deployPancakeStrategies } from "./helpers/deployStrategies";
import { deployPancakeV2, deployProxyContract } from "./helpers";
import { deployPancakeWorker } from "./helpers/deployWorker";
import { deployVault } from "./helpers/deployVault";
import { solidity } from "ethereum-waffle";
import { WrappedNativeTokenRelayer } from "../typechain/WrappedNativeTokenRelayer";
import { assertAlmostEqual } from "./helpers/assert";

chai.use(solidity);
const { expect } = chai;
describe("Client contract", async () => {
  const CAKE_REWARD_PER_BLOCK = ethers.utils.parseEther("0.076");
  const POOL_ID = 1;
  const REINVEST_BOUNTY_BPS = "100";

  // DEX (PCS)
  let factory: PancakeFactory;
  let router: PancakeRouterV2;
  let masterChef: PancakeMasterChef;
  let pancakeswapWorker01: PancakeswapWorker;
  let pancakeswapWorker02: PancakeswapWorker;
  let lp: PancakePair;
  let lpExt: PancakePair;
  let mockWBNB: MockWBNB;

  // Tokens
  let baseToken: MockToken;
  let targetToken: MockToken;
  let testToken: MockToken;
  let cake: CakeToken;
  let syrup: SyrupBar;

  // BC
  let feeCollector: FeeCollector;

  // Signers
  let deployer: Signer;
  let alice: Signer;

  let yieldFi: Signer;

  let deployerAddress: string;
  let aliceAddress: string;
  let yieldFiAddress: string;

  // Protocol Manager
  let protocolManager: ProtocolManager;

  // Clients
  let exampleClient: Client;

  // Protocol
  let vault: Vault;
  let vaultConfig: VaultConfig;
  let wNativeRelayer: WrappedNativeTokenRelayer;

  // Strats
  let addStrat: PancakeswapStrategyAddToPoolWithBaseToken;
  let addStratNoBase: PancakeswapStrategyAddToPoolWithoutBaseToken;
  let liqStrat: PancakeswapStrategyLiquidate;

  // Helpers & misc
  let swapHelper: SwapHelper;

  // Connectors
  let baseTokenAsAlice: MockToken;
  let exampleClientAsAlice: Client;

  async function fixture() {
    [deployer, alice, yieldFi] = await ethers.getSigners();
    [deployerAddress, aliceAddress, yieldFiAddress] = await Promise.all([
      deployer.getAddress(),
      alice.getAddress(),
      yieldFi.getAddress(),
    ]);

    baseToken = await deployToken(
      {
        name: "BASETOKEN",
        symbol: "BTOKEN",
        holders: [{ address: deployerAddress, amount: ethers.utils.parseEther("10000") }],
      },
      deployer
    );

    targetToken = await deployToken(
      {
        name: "TARGETTOKEN",
        symbol: "TTOKEN",
        holders: [{ address: deployerAddress, amount: ethers.utils.parseEther("10000") }],
      },
      deployer
    );

    testToken = await deployToken(
      {
        name: "TESTTOKEN",
        symbol: "TSTOKEN",
        holders: [{ address: deployerAddress, amount: ethers.utils.parseEther("10000") }],
      },
      deployer
    );

    mockWBNB = await deployWBNB(deployer);

    await mockWBNB.mint(deployerAddress, ethers.utils.parseEther("10000"));

    [factory, router, cake, syrup, masterChef] = await deployPancakeV2(
      mockWBNB,
      CAKE_REWARD_PER_BLOCK,
      [{ address: deployerAddress, amount: ethers.utils.parseEther("10000") }],
      deployer
    );

    // Setup general protocol manager
    protocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[deployerAddress]],
      deployer
    )) as ProtocolManager;

    feeCollector = (await deployProxyContract(
      "FeeCollector",
      [baseToken.address, "500", protocolManager.address],
      deployer
    )) as FeeCollector;

    // Treasury acc = yieldFi protocol owner
    [vault, vaultConfig, wNativeRelayer] = await deployVault(
      mockWBNB,
      baseToken,
      protocolManager.address,
      feeCollector.address,
      yieldFiAddress,
      deployer
    );

    // Setup strategies
    [addStrat, addStratNoBase, liqStrat] = await deployPancakeStrategies(router, deployer);

    // Setup BTOKEN-FTOKEN pair on Pancakeswap
    // Add lp to masterChef's pool
    await factory.createPair(baseToken.address, targetToken.address);
    await factory.createPair(testToken.address, targetToken.address);
    lp = PancakePair__factory.connect(
      await factory.getPair(targetToken.address, baseToken.address),
      deployer
    );

    lpExt = PancakePair__factory.connect(
      await factory.getPair(targetToken.address, testToken.address),
      deployer
    );

    await masterChef.add(1, lp.address, true);
    await masterChef.add(2, lpExt.address, true);

    /// Setup PancakeswapWorker
    pancakeswapWorker01 = await deployPancakeWorker(
      vault,
      baseToken,
      masterChef,
      router,
      POOL_ID,
      [cake.address, mockWBNB.address, baseToken.address],
      0,
      REINVEST_BOUNTY_BPS,
      protocolManager.address,
      deployer
    );

    pancakeswapWorker02 = await deployPancakeWorker(
      vault,
      baseToken,
      masterChef,
      router,
      POOL_ID + 1, // Next alloc point
      [cake.address, mockWBNB.address, baseToken.address],
      0,
      REINVEST_BOUNTY_BPS,
      protocolManager.address,
      deployer
    );

    await pancakeswapWorker01.setStrategies([
      addStrat.address,
      addStratNoBase.address,
      liqStrat.address,
    ]);
    await pancakeswapWorker02.setStrategies([
      addStrat.address,
      addStratNoBase.address,
      liqStrat.address,
    ]);

    swapHelper = new SwapHelper(
      factory.address,
      router.address,
      BigNumber.from(9975),
      BigNumber.from(10000),
      deployer
    );

    await swapHelper.addLiquidities([
      {
        token0: baseToken,
        token1: targetToken,
        amount0desired: ethers.utils.parseEther("0.1"),
        amount1desired: ethers.utils.parseEther("10"),
      },
      {
        token0: cake,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("0.1"),
        amount1desired: ethers.utils.parseEther("1"),
      },
      {
        token0: baseToken,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("1"),
        amount1desired: ethers.utils.parseEther("1"),
      },
      {
        token0: targetToken,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("1"),
        amount1desired: ethers.utils.parseEther("1"),
      },
      {
        token0: testToken,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("1"),
        amount1desired: ethers.utils.parseEther("1"),
      },
      {
        token0: testToken,
        token1: baseToken,
        amount0desired: ethers.utils.parseEther("1"),
        amount1desired: ethers.utils.parseEther("1"),
      },
      {
        token0: testToken,
        token1: targetToken,
        amount0desired: ethers.utils.parseEther("1"),
        amount1desired: ethers.utils.parseEther("1"),
      },
    ]);

    // Add worker to the register
    await protocolManager.approveWorkers(
      [pancakeswapWorker01.address, pancakeswapWorker02.address],
      true
    );

    // Clients
    exampleClient = (await deployProxyContract(
      "Client",
      [
        "Binance",
        "Binance Client",
        protocolManager.address,
        feeCollector.address,
        [deployerAddress],
      ],
      deployer
    )) as Client;

    // Whitelist deployer as client contract operator
    await exampleClient.whitelistOperators([deployerAddress], true);

    // Enable workers on the client side
    await exampleClient.toggleWorkers(
      [pancakeswapWorker01.address, pancakeswapWorker02.address],
      true
    );

    // Whitelist client
    await protocolManager.approveClients([exampleClient.address], true);

    // Signers
    baseTokenAsAlice = baseToken.connect(alice);
    exampleClientAsAlice = exampleClient.connect(alice);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  context("deposit method - base token only", async () => {
    it("should execute deposit flow on behalf of given end user", async () => {
      // Deposit amount
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");

      // Mint some token for the alice
      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);

      // Whitelist operator
      await exampleClient.whitelistOperators([deployerAddress], true);

      // Whitelist Alice (caller)
      await exampleClient.whitelistCallers([aliceAddress], true);

      // Alice (DEX user) must approve client contract, so client contract can transfer asset to the Vault
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);

      // Using previously minted tokens, enter the protocol via path: Client.deposit -> Vault.work -> Worker.work -> Strategy.execute()
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);

      // ID 1 = first position within the vault
      const position = await vault.positions(1);
      const positionInfo = await vault.positionInfo(1);

      // Validate position info
      expect(position.worker).to.be.eql(pancakeswapWorker01.address);
      expect(position.owner).to.be.eql(aliceAddress);
      expect(position.client).to.be.eql(exampleClient.address);

      // Position opened for 1 BASETOKEN initially; subtract swap fees and here we go with ~ 0.999649838808597569;
      expect(positionInfo).to.be.bignumber.that.is.eql(
        ethers.utils.parseEther("0.999649838808597569")
      );
    });

    it("should revert if target work is disabled by client", async () => {
      // Disable worker
      await exampleClient.toggleWorkers([pancakeswapWorker01.address], false);

      // Proceed with entering the protocol
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await exampleClient.whitelistOperators([deployerAddress], true);
      await exampleClient.whitelistCallers([aliceAddress], true);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await expect(
        exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT)
      ).to.be.revertedWith("ClientContract: Target pool hasn't been enabled by the client");
    });
  });

  context("deposit method - no common token (Vault <-> Worker)", async () => {
    it("should execute deposit flow on behalf of given end user", async () => {
      // Deposit amount
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");

      // Mint some token for the alice
      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);

      // Whitelist operator
      await exampleClient.whitelistOperators([deployerAddress], true);

      // Whitelist Alice (caller)
      await exampleClient.whitelistCallers([aliceAddress], true);

      // Alice (DEX user) must approve client contract, so client contract can transfer asset to the Vault
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);

      // Using previously minted tokens, enter the protocol via path: Client.deposit -> Vault.work -> Worker.work -> Strategy.execute()
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT);

      // ID 1 = first position within the vault
      const position = await vault.positions(1);
      const positionInfo = await vault.positionInfo(1);

      // Validate position info
      expect(position.worker).to.be.eql(pancakeswapWorker02.address);
      expect(position.owner).to.be.eql(aliceAddress);
      expect(position.client).to.be.eql(exampleClient.address);

      // Position opened for 1 BASETOKEN initially; subtract swap fees and here we go with ~ 1.971394083659056879 (due to liquidity ratios) [1 BT -> TST -> TT];
      assertAlmostEqual(
        positionInfo.toString(),
        ethers.utils.parseEther("1.971394083659056879").toString()
      );
    });
  });

  context("withdraw method", async () => {
    it("should execute withdrawal flow on behalf of given end user", async () => {
      // Same stuff above
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await exampleClient.whitelistOperators([deployerAddress], true);
      await exampleClient.whitelistCallers([aliceAddress], true);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);

      // Alice entered protocol with 1 BASE TOKEN and now her wallet is empty
      expect(await baseToken.balanceOf(aliceAddress)).to.be.bignumber.that.is.eql(
        ethers.utils.parseEther("0")
      );

      // Execute withdrawal flow
      await exampleClientAsAlice.withdraw(1, aliceAddress, pancakeswapWorker01.address);

      console.log(
        "TODO: Aktualnie strategia likwidacji wyplaca asset na callera - w przypadku wyplaty przy aktualnej logice, callerem jest Vault. Do zmiany"
      );
    });
  });

  context("set worker fee", async () => {
    it("should revert upon providing invalid worker address", async () => {
      expect(exampleClient.setWorkerFee(ethers.constants.AddressZero, 100)).to.be.reverted;
    });

    it("should revert when fee is greater than or equal to 100%", async () => {
      await expect(
        exampleClient.setWorkerFee(pancakeswapWorker01.address, 10001)
      ).to.be.revertedWith("ClientContract: Invalid fee amount given");
    });

    it("should work if provided fee is valid", async () => {
      await exampleClient.setWorkerFee(pancakeswapWorker01.address, 500);

      expect(
        await pancakeswapWorker01.getClientFee(exampleClient.address)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from(500));
    });
  });

  context("reward collect", async () => {
    it("should work as intended", async () => {
      // Approvals
      await protocolManager.approveClients([exampleClient.address], true);
      await protocolManager.approveBountyCollectors([feeCollector.address], true);
      await protocolManager.approveVaults([vault.address], true);
      await protocolManager.approveWorkers(
        [pancakeswapWorker01.address, pancakeswapWorker02.address],
        true
      );
      await protocolManager.approveAdminContract(deployerAddress); // Workaround
      await pancakeswapWorker01.setHarvestersOk([deployerAddress], true);
      await vault.approveRewardAssigners([pancakeswapWorker01.address], true);
      await pancakeswapWorker01.setTreasuryFee(1000); // 10% for the protocol owner
      await exampleClient.setWorkerFee(pancakeswapWorker01.address, 500); // 10% for the client
      await exampleClient.whitelistCallers([deployerAddress], true);

      // Open some positions
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await exampleClient.whitelistOperators([deployerAddress], true);
      await exampleClient.whitelistCallers([aliceAddress], true);

      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);

      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);

      // Empty positions
      expect(await vault.rewards(1)).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));
      expect(await vault.rewards(2)).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));

      // Transfer previously minted CAKE to the worker (simulate harvesting CAKE from staking pool)
      await cake.transfer(pancakeswapWorker01.address, ethers.utils.parseEther("10"));

      await pancakeswapWorker01.harvestRewards();

      // Some cake should have been registered
      expect(await vault.rewards(1)).to.be.bignumber.that.is.not.eql(ethers.BigNumber.from("0"));
      expect(await vault.rewards(2)).to.be.bignumber.that.is.not.eql(ethers.BigNumber.from("0"));

      expect(await feeCollector.fees(exampleClient.address)).to.be.bignumber.that.is.not.eql(
        ethers.BigNumber.from("0")
      );
      expect(
        await feeCollector.fees(await vaultConfig.treasuryAccount())
      ).to.be.bignumber.that.is.not.eql(ethers.BigNumber.from("0"));

      // Collect
      await exampleClient.collectReward(1, aliceAddress, baseToken.address);
      await exampleClient.collectReward(2, aliceAddress, baseToken.address);

      // Position have been emptied out
      expect(await vault.rewards(1)).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));
      expect(await vault.rewards(2)).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));
    });
  });
});
