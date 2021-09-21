import "@openzeppelin/test-helpers";

import { BigNumber, Signer, constants } from "ethers";
import {
  CakeToken,
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
} from "../typechain";
import { config, ethers, upgrades, waffle } from "hardhat";
import { deployToken, deployTokens, deployWBNB } from "./helpers/deployToken";

import { MockContractContext } from "../typechain/MockContractContext";
import { MockToken } from "../typechain/MockToken";
import { PancakeswapStrategyAddBaseTokenOnly } from "../typechain/PancakeswapStrategyAddBaseTokenOnly";
import { PancakeswapStrategyLiquidate } from "../typechain/PancakeswapStrategyLiquidate";
// import * as AssertHelpers from "./helpers/assert";
// import * as TimeHelpers from "./helpers/time";
import { PancakeswapWorker } from "../typechain/PancakeswapWorker";
import { SwapHelper } from "./helpers/swap";
import { Worker02Helper } from "./helpers/worker";
import { assertAlmostEqual } from "./helpers/assert";
import chai from "chai";
import { deployPancakeStrategies } from "./helpers/deployStrategies";
import { deployPancakeV2 } from "./helpers";
import { deployPancakeWorker } from "./helpers/deployWorker";
import { deployVault } from "./helpers/deployVault";
import { parseEther } from "ethers/lib/utils";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;
describe("Vault - interactions", async () => {
  const CAKE_REWARD_PER_BLOCK = ethers.utils.parseEther("0.076");
  const POOL_ID = 1;
  const REINVEST_BOUNTY_BPS = "100";
  const REINVEST_THRESHOLD = ethers.utils.parseEther("1"); // Reinvest CAKE rewards only when 1 unit of CAKE is has been reached

  // DEX (PCS)
  let factory: PancakeFactory;
  let router: PancakeRouterV2;
  let masterChef: PancakeMasterChef;
  let pancakeswapWorker01: PancakeswapWorker;
  let pancakeswapWorker02: PancakeswapWorker;
  let lp: PancakePair;
  let mockWBNB: MockWBNB;

  // Tokens
  let baseToken: MockToken;
  let targetToken: MockToken;
  let cake: CakeToken;
  let syrup: SyrupBar;

  // Signers
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let eve: Signer;

  let deployerAddress: string;
  let aliceAddress: string;
  let bobAddress: string;
  let eveAddress: string;

  // Protocol
  let vault: Vault;
  let vaultConfig: VaultConfig;
  let wNativeRelayer: WNativeRelayer;
  let whitelistedContract: MockContractContext;
  let evilContract: MockContractContext;

  // Strats
  let addStrat: PancakeswapStrategyAddBaseTokenOnly;
  let liqStrat: PancakeswapStrategyLiquidate;

  // Helpers & misc
  let swapHelper: SwapHelper;

  // Connected entities (signer to target entity)
  let baseTokenAsAlice: MockToken;
  let baseTokenAsBob: MockToken;

  let farmTokenAsAlice: MockToken;

  let lpAsAlice: PancakePair;
  let lpAsBob: PancakePair;

  let pancakeMasterChefAsAlice: PancakeMasterChef;
  let pancakeMasterChefAsBob: PancakeMasterChef;

  let pancakeswapWorkerAsEve: PancakeswapWorker;

  let vaultAsAlice: Vault;
  let vaultAsBob: Vault;
  let vaultAsEve: Vault;

  async function fixture() {
    [deployer, alice, bob, eve] = await ethers.getSigners();
    [deployerAddress, aliceAddress, bobAddress, eveAddress] = await Promise.all([
      deployer.getAddress(),
      alice.getAddress(),
      bob.getAddress(),
      eve.getAddress(),
    ]);

    // Setup MockContractContext
    const MockContractContext = (await ethers.getContractFactory(
      "MockContractContext",
      deployer
    )) as MockContractContext__factory;
    whitelistedContract = await MockContractContext.deploy();
    await whitelistedContract.deployed();
    evilContract = await MockContractContext.deploy();
    await evilContract.deployed();

    baseToken = await deployToken(
      {
        name: "BASETOKEN",
        symbol: "BTOKEN",
        holders: [
          { address: deployerAddress, amount: ethers.utils.parseEther("1000") },
          { address: aliceAddress, amount: ethers.utils.parseEther("1000") },
          { address: bobAddress, amount: ethers.utils.parseEther("1000") },
        ],
      },
      deployer
    );

    targetToken = await deployToken(
      {
        name: "TARGETTOKEN",
        symbol: "TTOKEN",
        holders: [
          { address: deployerAddress, amount: ethers.utils.parseEther("1000") },
          { address: aliceAddress, amount: ethers.utils.parseEther("1000") },
          { address: bobAddress, amount: ethers.utils.parseEther("1000") },
        ],
      },
      deployer
    );

    mockWBNB = await deployWBNB(deployer);

    [factory, router, cake, syrup, masterChef] = await deployPancakeV2(
      mockWBNB,
      CAKE_REWARD_PER_BLOCK,
      [{ address: deployerAddress, amount: ethers.utils.parseEther("100") }],
      deployer
    );

    // Treasury acc = address zero (?)
    [vault, vaultConfig, wNativeRelayer] = await deployVault(
      mockWBNB,
      ethers.constants.AddressZero,
      baseToken,
      deployer
    );

    // Setup strategies
    [addStrat, liqStrat] = await deployPancakeStrategies(router, deployer);

    // Setup BTOKEN-FTOKEN pair on Pancakeswap
    // Add lp to masterChef's pool
    await factory.createPair(baseToken.address, targetToken.address);
    lp = PancakePair__factory.connect(
      await factory.getPair(targetToken.address, baseToken.address),
      deployer
    );

    await masterChef.add(1, lp.address, true);

    /// Setup PancakeswapWorker
    pancakeswapWorker01 = await deployPancakeWorker(
      vault,
      baseToken,
      masterChef,
      router,
      POOL_ID,
      addStrat,
      [cake.address, mockWBNB.address, baseToken.address],
      0,
      eveAddress,
      REINVEST_BOUNTY_BPS,
      [cake.address, mockWBNB.address, baseToken.address],
      deployer
    );

    pancakeswapWorker02 = await deployPancakeWorker(
      vault,
      baseToken,
      masterChef,
      router,
      POOL_ID,
      addStrat,
      [cake.address, mockWBNB.address, baseToken.address],
      0,
      eveAddress,
      REINVEST_BOUNTY_BPS,
      [cake.address, mockWBNB.address, baseToken.address],
      deployer
    );

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
        amount0desired: ethers.utils.parseEther("1"),
        amount1desired: ethers.utils.parseEther("0.1"),
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
    ]);
    baseTokenAsAlice = MockToken__factory.connect(baseToken.address, alice);
    baseTokenAsBob = MockToken__factory.connect(baseToken.address, bob);

    farmTokenAsAlice = MockToken__factory.connect(targetToken.address, alice);

    lpAsAlice = PancakePair__factory.connect(lp.address, alice);
    lpAsBob = PancakePair__factory.connect(lp.address, bob);

    pancakeMasterChefAsAlice = PancakeMasterChef__factory.connect(masterChef.address, alice);
    pancakeMasterChefAsBob = PancakeMasterChef__factory.connect(masterChef.address, bob);

    vaultAsAlice = Vault__factory.connect(vault.address, alice);
    vaultAsBob = Vault__factory.connect(vault.address, bob);
    vaultAsEve = Vault__factory.connect(vault.address, eve);

    pancakeswapWorkerAsEve = PancakeswapWorker__factory.connect(pancakeswapWorker01.address, eve);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  context("TODO: Vault-related test suite", async () => {
    it("should provide well-written test suite in the future", async () => {
      console.log("TODO: Vault test suite.");
    });
  });
});
