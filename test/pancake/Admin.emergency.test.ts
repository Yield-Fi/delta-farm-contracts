import "@openzeppelin/test-helpers";

import { BigNumber, Signer } from "ethers";
import {
  CakeToken,
  FeeCollector,
  MockWBNB,
  PancakeFactory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  Vault,
  Client,
  PancakeswapStrategyAddToPoolWithBaseToken,
  PancakeswapStrategyAddToPoolWithoutBaseToken,
  ProtocolManager,
  Admin,
  PancakeMasterChefV2,
  PancakeswapWorkerV2,
  PancakeswapStrategyLiquidate,
} from "../../typechain";
import { ethers, waffle } from "hardhat";
import { deployToken, deployWBNB } from "../helpers/deployToken";

import { MockToken } from "../../typechain/MockToken";
import { SwapHelper } from "../helpers/swap";
import chai from "chai";
import { deployPancakeStrategies } from "../helpers/deployStrategies";
import { deployPancakeV2, deployProxyContract } from "../helpers";
import { deployPancakeWorkerV2 } from "../helpers/deployWorker";
import { deployVault } from "../helpers/deployVault";
import { solidity } from "ethereum-waffle";
import { assertAlmostEqual } from "../helpers/assert";

chai.use(solidity);
const { expect } = chai;
describe("Admin contract - emergency withdrawal", async () => {
  const POOL_ID = 0;
  const REINVEST_BOUNTY_BPS = "100";

  // DEX (PCS)
  let factory: PancakeFactory;
  let router: PancakeRouterV2;
  let masterChef: PancakeMasterChefV2;
  let pancakeswapWorker01: PancakeswapWorkerV2;
  let pancakeswapWorker02: PancakeswapWorkerV2;
  let lp: PancakePair;
  let lpExt: PancakePair;
  let mockWBNB: MockWBNB;

  // Tokens
  let baseToken: MockToken;
  let targetToken: MockToken;
  let testToken: MockToken;
  let cake: CakeToken;

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
  let yieldFiAddress: string;
  let clientOperatorAddress: string;

  // Protocol Manager
  let protocolManager: ProtocolManager;

  // Clients
  let exampleClient: Client;

  // Protocol
  let vault: Vault;

  // Strats
  let addStrat: PancakeswapStrategyAddToPoolWithBaseToken;
  let addStratNoBase: PancakeswapStrategyAddToPoolWithoutBaseToken;
  let liqStrat: PancakeswapStrategyLiquidate;

  // Helpers & misc
  let swapHelper: SwapHelper;

  // Connectors
  let baseTokenAsAlice: MockToken;
  let exampleClientAsAlice: Client;
  let exampleClientAsOperator: Client;

  async function fixture() {
    [, , , , , deployer, alice, yieldFi, bob, clientOperator] = await ethers.getSigners();
    [deployerAddress, aliceAddress, yieldFiAddress, , clientOperatorAddress] = await Promise.all([
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

    [factory, router, cake, , masterChef] = await deployPancakeV2(
      mockWBNB,
      [{ address: deployerAddress, amount: ethers.utils.parseEther("10000") }],
      deployer
    );

    // Setup general protocol manager
    protocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[deployerAddress]],
      deployer
    )) as ProtocolManager;

    await protocolManager.setStables([mockWBNB.address]);

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
    [vault, , ,] = await deployVault(
      mockWBNB,
      baseToken,
      protocolManager.address,
      feeCollector.address,
      yieldFiAddress,
      deployer
    );

    // Setup strategies
    [addStrat, addStratNoBase, liqStrat] = await deployPancakeStrategies(
      router,
      deployer,
      protocolManager
    );

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

    await masterChef.add(1, lp.address, true, true);
    await masterChef.add(2, lpExt.address, true, true);

    /// Setup PancakeswapWorker
    pancakeswapWorker01 = await deployPancakeWorkerV2(
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

    pancakeswapWorker02 = await deployPancakeWorkerV2(
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
        [ethers.constants.AddressZero], // Additional withdrawer
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
    exampleClientAsAlice = exampleClient.connect(alice);
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

      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT); // + 1 BLOCK
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT); // + 1 BLOCK
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT); // + 1 BLOCK
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT); // + 1 BLOCK
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT); // + 1 BLOCK
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT); // + 1 BLOCK

      // Emulate rewards gathered
      await cake.transfer(pancakeswapWorker01.address, ethers.utils.parseEther("10")); // + 1 BLOCK
      await cake.transfer(pancakeswapWorker02.address, ethers.utils.parseEther("10")); // + 1 BLOCK

      // Whole base token should have been utilized
      expect(await baseToken.balanceOf(aliceAddress)).to.be.bignumber.that.eql(BigNumber.from("0"));

      await adminContract.emergencyWithdraw(
        [pancakeswapWorker01.address, pancakeswapWorker02.address],
        [exampleClient.address, yieldFiAddress /* Treasury address! */] // + 1 BLOCK
      );

      // Pancakeswap MasterChefV2 generates 2.514 CAKE per BLOCK -> 8 BLOCKS * 2.514 CAKE = 20,112 CAKE + 20 CAKE transferred = 40,112 CAKE
      // 40.112 CAKE ~= 40.112 BUSD - 20% (client + admin fees) ~= 32.1 BUSD
      // Alice should get her assets back
      assertAlmostEqual(
        (await baseToken.balanceOf(aliceAddress)).toString(),
        ethers.utils.parseEther("32.100619358223023072").toString()
      );

      // All rewards should have been paid out
      expect(await vault.rewards(1 /* PID: 1 */)).to.be.bignumber.that.eql(BigNumber.from("0"));
      expect(await vault.rewards(2 /* PID: 2 */)).to.be.bignumber.that.eql(BigNumber.from("0"));
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

      // Client fee should have been paid out as well - ~ 40 CAKE - 10% - trading fees during swap on BUSD ~= 3.3 BUSD
      expect(await baseToken.balanceOf(exampleClient.address)).to.be.bignumber.that.eql(
        ethers.utils.parseEther("3.265815858272859322")
      );

      // YieldFee treasury address has already been supplied with fee, same formula above since both yieldFi and client have 10% fee set
      expect(await baseToken.balanceOf(yieldFiAddress)).to.be.bignumber.that.eql(
        ethers.utils.parseEther("3.265815858272859322")
      );
    });
  });
});
