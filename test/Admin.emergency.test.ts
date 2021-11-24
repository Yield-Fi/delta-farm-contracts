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
  Admin,
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
import { parseEther } from "@ethersproject/units";
import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";

chai.use(solidity);
const { expect } = chai;
describe("Admin contract - emergency withdrawal", async () => {
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
  let adminContract: Admin;

  // Signers
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let clientOperator: Signer;
  let yieldFi: Signer;

  let deployerAddress: string;
  let aliceAddress: string;
  let bobAddress: string;
  let yieldFiAddress: string;
  let clientOperatorAddress: string;

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
  let baseTokenAsBob: MockToken;
  let exampleClientAsAlice: Client;
  let exampleClientAsBob: Client;
  let exampleClientAsOperator: Client;

  async function fixture() {
    [deployer, alice, yieldFi, bob, clientOperator] = await ethers.getSigners();
    [deployerAddress, aliceAddress, yieldFiAddress, bobAddress, clientOperatorAddress] =
      await Promise.all([
        deployer.getAddress(),
        alice.getAddress(),
        yieldFi.getAddress(),
        bob.getAddress(),
        clientOperator.getAddress(),
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

    adminContract = (await deployProxyContract(
      "Admin",
      [protocolManager.address, feeCollector.address],
      deployer
    )) as Admin;

    await protocolManager.approveAdminContract(adminContract.address);

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
      "Worker01",
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
      "Worker02",
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
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: cake,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: baseToken,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: targetToken,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: testToken,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: testToken,
        token1: baseToken,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: testToken,
        token1: targetToken,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
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
        [clientOperatorAddress],
      ],
      deployer
    )) as Client;

    exampleClientAsOperator = exampleClient.connect(clientOperator);

    // Enable workers on the client side
    await exampleClientAsOperator.enableFarms([
      pancakeswapWorker01.address,
      pancakeswapWorker02.address,
    ]);

    // Whitelist client
    await protocolManager.approveClients([exampleClient.address], true);

    await protocolManager.approveVaults([vault.address], true);

    // Signers
    baseTokenAsAlice = baseToken.connect(alice);
    baseTokenAsBob = baseToken.connect(bob);
    exampleClientAsAlice = exampleClient.connect(alice);
    exampleClientAsBob = exampleClient.connect(bob);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  context("emergency withdrawal", async () => {
    it("should execute emergency withdrawal procedure", async () => {
      // Well, we need her
      await exampleClientAsOperator.whitelistUsers([aliceAddress], true);

      // Set fees amounts for further calcs
      await exampleClientAsOperator.setFarmsFee(
        [pancakeswapWorker01.address, pancakeswapWorker02.address],
        1000 // 10%
      );

      await adminContract.setFarmsFee(
        [pancakeswapWorker01.address, pancakeswapWorker02.address],
        1000
      ); // 10%

      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      const MINT_AMOUNT = ethers.utils.parseEther("6");

      await baseToken.mint(aliceAddress, MINT_AMOUNT);

      await baseTokenAsAlice.approve(exampleClient.address, MINT_AMOUNT);

      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT);

      // Emulate rewards gathered
      await cake.transfer(pancakeswapWorker01.address, ethers.utils.parseEther("10"));
      await cake.transfer(pancakeswapWorker02.address, ethers.utils.parseEther("10"));

      // Whole base token should have been utilized
      expect(await baseToken.balanceOf(aliceAddress)).to.be.bignumber.that.eql(BigNumber.from("0"));

      await adminContract.emergencyWithdraw(
        [pancakeswapWorker01.address, pancakeswapWorker02.address],
        [exampleClient.address, yieldFiAddress /* Treasury address! */]
      );

      // 20 CAKE ~= 20 BUSD since 1:1 initial ratio -  2 * 10% fee * 10 CAKE  + 6 USD initial ->  ~= 21.538796449897046794 (price offset due to pool swap)
      // Alice should get her assets back
      expect(await baseToken.balanceOf(aliceAddress)).to.be.bignumber.that.eql(
        ethers.utils.parseEther("21.538796449897046794")
      );

      // All rewards should have been paid out
      expect(await vault.rewards(1 /* PID: 1 */)).to.be.bignumber.that.eql(BigNumber.from("0"));
      expect(await vault.rewards(1 /* PID: 2 */)).to.be.bignumber.that.eql(BigNumber.from("0"));
      expect(await vault.rewardsToCollect(aliceAddress)).to.be.bignumber.that.eql(
        BigNumber.from("0")
      );

      // CAKE-balances of given workers should be zero-ed
      expect(await cake.balanceOf(pancakeswapWorker01.address)).to.be.bignumber.that.eql(
        BigNumber.from("0")
      );
      expect(await cake.balanceOf(pancakeswapWorker02.address)).to.be.bignumber.that.eql(
        BigNumber.from("0")
      );

      // Vault should be empty at this point since whole coverage has been paid out
      expect(await cake.balanceOf(vault.address)).to.be.bignumber.that.eql(BigNumber.from("0"));
      expect(await baseToken.balanceOf(vault.address)).to.be.bignumber.that.eql(
        BigNumber.from("0")
      );

      // Client fee should have been paid out as well - ~ 2 CAKE since 10 % * 10 CAKE total * 2 (may be less)
      expect(await baseToken.balanceOf(exampleClient.address)).to.be.bignumber.that.eql(
        ethers.utils.parseEther("1.945152730923840033")
      );

      // YieldFee treasury address has already been supplied with fee, same formula above since both yieldFi and client have 10% fee set
      expect(await baseToken.balanceOf(yieldFiAddress)).to.be.bignumber.that.eql(
        ethers.utils.parseEther("1.945152730923840033")
      );
    });
  });
});
