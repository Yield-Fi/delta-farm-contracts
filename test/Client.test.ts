import "@openzeppelin/test-helpers";

import { BigNumber, Signer, constants } from "ethers";
import {
  CakeToken,
  BountyCollector,
  MockContractContext__factory,
  MockToken__factory,
  MockWBNB,
  PancakeFactory,
  PancakeMasterChef,
  PancakeMasterChef__factory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  PancakeswapWorker__factory,
  SyrupBar,
  Vault,
  VaultConfig,
  Vault__factory,
  WNativeRelayer,
  Client,
  MockWBNB__factory,
  Client__factory,
  WorkerRouter,
  PancakeswapStrategyAddToPoolWithBaseToken,
  PancakeswapStrategyAddToPoolWithoutBaseToken,
} from "../typechain";
import { config, ethers, upgrades, waffle } from "hardhat";
import { deployToken, deployTokens, deployWBNB } from "./helpers/deployToken";

import { MockContractContext } from "../typechain/MockContractContext";
import { MockToken } from "../typechain/MockToken";
import { PancakeswapStrategyLiquidate } from "../typechain/PancakeswapStrategyLiquidate";
// import * as AssertHelpers from "./helpers/assert";
// import * as TimeHelpers from "./helpers/time";
import { PancakeswapWorker } from "../typechain/PancakeswapWorker";
import { SwapHelper } from "./helpers/swap";
import { Worker02Helper } from "./helpers/worker";
import { assertAlmostEqual } from "./helpers/assert";
import chai from "chai";
import { deployPancakeStrategies } from "./helpers/deployStrategies";
import { deployPancakeV2, deployProxyContract } from "./helpers";
import { deployPancakeWorker } from "./helpers/deployWorker";
import { deployVault } from "./helpers/deployVault";
import { parseEther } from "ethers/lib/utils";
import { solidity } from "ethereum-waffle";
import { advanceBlock } from "./helpers/time";

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
  let bountyCollector: BountyCollector;

  // Signers
  let deployer: Signer;
  let alice: Signer;

  let yieldFi: Signer;

  let deployerAddress: string;
  let aliceAddress: string;
  let yieldFiAddress: string;

  // Clients
  let exampleClient: Client;

  // Worker Router
  let workerRouter: WorkerRouter;

  // Protocol
  let vault: Vault;
  let vaultConfig: VaultConfig;
  let wNativeRelayer: WNativeRelayer;

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

    bountyCollector = (await deployProxyContract(
      "BountyCollector",
      [baseToken.address, "500"],
      deployer
    )) as BountyCollector;

    // Treasury acc = yieldFi protocol owner
    [vault, vaultConfig, wNativeRelayer] = await deployVault(
      mockWBNB,
      bountyCollector.address,
      yieldFiAddress,
      baseToken,
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
      ethers.constants.AddressZero,
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
      ethers.constants.AddressZero,
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

    // Whitelist workers
    await vaultConfig.setWorkers(
      [pancakeswapWorker01.address, pancakeswapWorker02.address], // Workers
      [pancakeswapWorker01.address, pancakeswapWorker02.address] // Config (same pointers)
    );

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

    // Setup workers router that will provide pairs' mapping later on
    workerRouter = (await deployProxyContract("WorkerRouter", [], deployer)) as WorkerRouter;

    // Whitelist deployer so we can add workers to the register
    await workerRouter.whitelistOperators([deployerAddress], true);

    // Add worker to the register
    await workerRouter.addWorkerAutoDiscover(pancakeswapWorker01.address, false);
    await workerRouter.addWorkerAutoDiscover(pancakeswapWorker02.address, false);

    // Clients
    exampleClient = (await deployProxyContract(
      "Client",
      ["Binance", "Binance Client", workerRouter.address],
      deployer
    )) as Client;

    // Whitelist clients within vault config
    await vaultConfig.setWhitelistedCallers([exampleClient.address], true);

    // Signers
    baseTokenAsAlice = baseToken.connect(alice);
    exampleClientAsAlice = exampleClient.connect(alice);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  context("# deposit method - base token only", async () => {
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
      await exampleClientAsAlice.deposit(
        aliceAddress,
        baseToken.address,
        targetToken.address,
        DEPOSIT_AMOUNT
      );

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
  });

  context("# deposit method - no common token (Vault <-> Worker)", async () => {
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
      await exampleClientAsAlice.deposit(
        aliceAddress,
        testToken.address,
        targetToken.address,
        DEPOSIT_AMOUNT
      );

      // ID 1 = first position within the vault
      const position = await vault.positions(1);
      const positionInfo = await vault.positionInfo(1);

      // Validate position info
      expect(position.worker).to.be.eql(pancakeswapWorker02.address);
      expect(position.owner).to.be.eql(aliceAddress);
      expect(position.client).to.be.eql(exampleClient.address);

      // Position opened for 1 BASETOKEN initially; subtract swap fees and here we go with ~ 1.971394083659056878 (due to liquidity ratios) [1 BT -> TST -> TT];
      expect(positionInfo).to.be.bignumber.that.is.eql(
        ethers.utils.parseEther("1.971394083659056878")
      );
    });
  });

  context("# withdraw method", async () => {
    it("should execute withdrawal flow on behalf of given end user", async () => {
      // Same stuff above
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await exampleClient.whitelistOperators([deployerAddress], true);
      await exampleClient.whitelistCallers([aliceAddress], true);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(
        aliceAddress,
        baseToken.address,
        targetToken.address,
        DEPOSIT_AMOUNT
      );

      // Alice entered protocol with 1 BASE TOKEN and now her wallet is empty
      expect(await baseToken.balanceOf(aliceAddress)).to.be.bignumber.that.is.eql(
        ethers.utils.parseEther("0")
      );

      // Execute withdrawal flow
      await exampleClientAsAlice.withdraw(1, aliceAddress, baseToken.address, targetToken.address);

      console.log(
        "TODO: Aktualnie strategia likwidacji wyplaca asset na callera - w przypadku wyplaty przy aktualnej logice, callerem jest Vault. Do zmiany"
      );
    });
  });
});