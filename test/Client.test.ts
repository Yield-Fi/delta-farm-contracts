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
import { parseEther } from "@ethersproject/units";

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

  // BC
  let feeCollector: FeeCollector;

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

    [factory, router, cake, , masterChef] = await deployPancakeV2(
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
    [vault, vaultConfig] = await deployVault(
      mockWBNB,
      baseToken,
      protocolManager.address,
      feeCollector.address,
      yieldFiAddress,
      deployer
    );

    // Setup strategies
    [addStrat, addStratNoBase, liqStrat] = await deployPancakeStrategies(router, deployer, [
      mockWBNB.address,
    ]);

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
        amount0desired: ethers.utils.parseEther("100"),
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

    // Signers
    baseTokenAsAlice = baseToken.connect(alice);
    baseTokenAsBob = baseToken.connect(bob);
    exampleClientAsAlice = exampleClient.connect(alice);
    exampleClientAsBob = exampleClient.connect(bob);
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

      // Whitelist Alice (caller)
      await exampleClientAsOperator.whitelistUsers([aliceAddress], true);

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

      // Position opened for 1 BASETOKEN initially; subtract swap fees and here we go with ~ 0.996503741585422602;
      expect(positionInfo.toString()).to.be.eql(
        ethers.utils.parseEther("0.996503741585422602").toString()
      );
    });

    it("should revert if target work is disabled by client", async () => {
      // Disable worker
      await exampleClientAsOperator.disableFarms([pancakeswapWorker01.address]);

      expect(await exampleClient.isFarmEnabled(pancakeswapWorker01.address)).to.be.false;

      // Proceed with entering the protocol
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await exampleClientAsOperator.whitelistUsers([aliceAddress], true);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await expect(
        exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT)
      ).to.be.revertedWith("ClientContract: Target farm hasn't been enabled by the client");
    });

    it("should estimate deposit correctly", async () => {
      const [firstPartOfBaseToken, secondPartOfBaseToken, amountOfToken0, amountOfToken1] =
        await exampleClient.callStatic.estimateDeposit(
          pancakeswapWorker01.address,
          parseEther("2")
        );

      expect(firstPartOfBaseToken.toString()).to.be.eq(
        parseEther("1.000000000000000000").toString()
      );
      expect(secondPartOfBaseToken.toString()).to.be.eq(
        parseEther("1.000000000000000000").toString()
      );
      expect(firstPartOfBaseToken.add(secondPartOfBaseToken).toString()).to.be.eq(
        parseEther("2").toString()
      );
      expect(amountOfToken0.toString()).to.be.eq(parseEther("0.996505985279683515").toString());
      expect(amountOfToken1.toString()).to.be.eq(parseEther("0.1000000000000000000").toString());
    });
  });

  context("deposit method - no common token (Vault <-> Worker)", async () => {
    it("should execute deposit flow on behalf of given end user", async () => {
      // Deposit amount
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");

      // Mint some token for the alice
      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);

      // Whitelist Alice (caller)
      await exampleClientAsOperator.whitelistUsers([aliceAddress], true);

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

      // Position opened for 1 BASETOKEN initially; subtract swap fees and here we go with ~ 0.995504994395289884 (due to liquidity ratios) [1 BT -> TST -> TT];
      assertAlmostEqual(
        positionInfo.toString(),
        ethers.utils.parseEther("0.995504994395289884").toString()
      );
    });

    it("should revert transaction when user is not whitelisted", async () => {
      await exampleClientAsOperator.whitelistUsers([aliceAddress], false);

      expect(
        exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, 100)
      ).to.be.revertedWith("ClientContract: Caller not whitelisted.");
    });

    it("should estimate deposit correctly", async () => {
      const [firstPartOfBaseToken, secondPartOfBaseToken, amountOfToken0, amountOfToken1] =
        await exampleClient.callStatic.estimateDeposit(
          pancakeswapWorker02.address,
          parseEther("2")
        );

      expect(firstPartOfBaseToken.toString()).to.be.eq(parseEther("1").toString());
      expect(secondPartOfBaseToken.toString()).to.be.eq(parseEther("1").toString());
      expect(firstPartOfBaseToken.add(secondPartOfBaseToken).toString()).to.be.eq(
        parseEther("2").toString()
      );
      expect(amountOfToken0.toString()).to.be.eq(parseEther("0.996505985279683515").toString());
      expect(amountOfToken1.toString()).to.be.eq(parseEther("0.996505985279683515").toString());
    });
  });

  context("withdraw method", async () => {
    it("should execute withdrawal flow on behalf of given end user", async () => {
      // Same stuff above
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await exampleClientAsOperator.whitelistUsers([aliceAddress], true);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);

      // Alice entered protocol with 1 BASE TOKEN and now her wallet is empty
      expect(await baseToken.balanceOf(aliceAddress)).to.be.bignumber.that.is.eql(
        ethers.utils.parseEther("0")
      );

      expect(
        (await exampleClient.amountToWithdraw(pancakeswapWorker01.address, aliceAddress)).toString()
      ).to.be.eq(parseEther("0.996503741585422602").toString());

      // Execute withdrawal flow
      await exampleClientAsAlice.withdraw(aliceAddress, pancakeswapWorker01.address, 0);

      // Alice received ~= 1 base token after withdraw
      expect((await baseToken.balanceOf(aliceAddress)).toString()).to.be.eql(
        ethers.utils.parseEther("0.996503741585422602").toString()
      );
    });

    it("should revert transaction when user is not whitelisted", async () => {
      await exampleClientAsOperator.whitelistUsers([aliceAddress], false);

      expect(
        exampleClientAsAlice.withdraw(aliceAddress, pancakeswapWorker01.address, 100)
      ).to.be.revertedWith("ClientContract: Caller not whitelisted.");
    });
  });

  context("set worker fee", async () => {
    it("should revert upon providing invalid worker address", async () => {
      expect(exampleClientAsOperator.setFarmsFee([ethers.constants.AddressZero], 100)).to.be
        .reverted;
    });

    it("should revert when fee is greater than or equal to 100%", async () => {
      await expect(
        exampleClientAsOperator.setFarmsFee([pancakeswapWorker01.address], 10001)
      ).to.be.revertedWith("ClientContract: Invalid fee amount given");
    });

    it("should work if provided fee is valid and view functions return correct fee's data", async () => {
      await exampleClientAsOperator.setFarmsFee([pancakeswapWorker01.address], 500);

      expect(
        await exampleClient.getFarmClientFee(pancakeswapWorker01.address)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from(500));

      await protocolManager.approveAdminContract(deployerAddress); // Workaround
      await pancakeswapWorker01.setTreasuryFee(1000);
      // + 10% treasury fee
      expect(
        await exampleClient.getFarmFee(pancakeswapWorker01.address)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from(1500));
    });

    it("should revert transaction when operator is not whitelisted", async () => {
      await exampleClientAsOperator.whitelistOperators([aliceAddress], false);

      expect(
        exampleClientAsAlice.setFarmsFee([pancakeswapWorker01.address], 100)
      ).to.be.revertedWith("ClientContract: Operator not whitelisted.");
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
      await protocolManager.approveHarvesters([deployerAddress], true);
      await pancakeswapWorker01.setTreasuryFee(1000); // 10% for the protocol owner
      await exampleClientAsOperator.setFarmsFee([pancakeswapWorker01.address], 500); // 10% for the client
      await exampleClientAsOperator.whitelistUsers([deployerAddress], true);

      // Open some positions
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await exampleClientAsOperator.whitelistUsers([aliceAddress, bobAddress], true);

      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);

      await baseToken.mint(bobAddress, DEPOSIT_AMOUNT);
      await baseTokenAsBob.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsBob.deposit(bobAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);

      // Empty positions
      expect(
        await exampleClient.rewardToCollect(pancakeswapWorker01.address, aliceAddress)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));
      expect(
        await exampleClient.rewardToCollect(pancakeswapWorker01.address, bobAddress)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));

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
      await exampleClient.collectReward(pancakeswapWorker01.address, aliceAddress);
      await exampleClient.collectReward(pancakeswapWorker01.address, bobAddress);

      // Position have been emptied out
      expect(
        await exampleClient.rewardToCollect(pancakeswapWorker01.address, aliceAddress)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));
      expect(
        await exampleClient.rewardToCollect(pancakeswapWorker01.address, bobAddress)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));
    });

    it("should revert transaction when user is not whitelisted", async () => {
      await exampleClientAsOperator.whitelistUsers([aliceAddress], false);

      expect(
        exampleClientAsAlice.collectReward(pancakeswapWorker01.address, aliceAddress)
      ).to.be.revertedWith("ClientContract: Caller not whitelisted.");
    });

    it("rewardToCollect function should return 0 when position is not exists", async () => {
      expect(
        (await exampleClient.rewardToCollect(pancakeswapWorker01.address, aliceAddress)).toString()
      ).to.be.eq("0");
    });
  });

  context("Methods for the address whitelisting", () => {
    it("should whitelist operators", async () => {
      await exampleClientAsOperator.whitelistOperators([aliceAddress], false);

      expect(await exampleClient.isOperatorWhitelisted(aliceAddress)).to.be.false;

      await exampleClientAsOperator.whitelistOperators([aliceAddress], true);

      expect(await exampleClient.isOperatorWhitelisted(aliceAddress)).to.be.true;
    });

    it("should revert transaction when operator try whitelist oneself", async () => {
      expect(
        exampleClientAsOperator.whitelistOperators([clientOperatorAddress], false)
      ).to.be.revertedWith("Client contract: Cannot modify the caller's state");
    });

    it("should whitelist users", async () => {
      await exampleClientAsOperator.whitelistUsers([aliceAddress], false);

      expect(await exampleClient.isUserWhitelisted(aliceAddress)).to.be.false;

      await exampleClientAsOperator.whitelistUsers([aliceAddress], true);

      expect(await exampleClient.isUserWhitelisted(aliceAddress)).to.be.true;
    });
  });

  context("Collect all rewards", () => {
    it("should work as intended and collect fee", async () => {
      // Approvals
      await protocolManager.approveClients([exampleClient.address], true);
      await protocolManager.approveBountyCollectors([feeCollector.address], true);
      await protocolManager.approveVaults([vault.address], true);
      await protocolManager.approveWorkers(
        [pancakeswapWorker01.address, pancakeswapWorker02.address],
        true
      );
      await protocolManager.approveAdminContract(deployerAddress); // Workaround
      await protocolManager.approveHarvesters([deployerAddress], true);
      await pancakeswapWorker01.setTreasuryFee(1000); // 10% for the protocol owner
      await exampleClientAsOperator.setFarmsFee(
        [pancakeswapWorker01.address, pancakeswapWorker02.address],
        500
      ); // 5% for the client
      await exampleClientAsOperator.whitelistUsers([deployerAddress], true);

      // Open two positions on two different farms
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await exampleClientAsOperator.whitelistUsers([aliceAddress], true);

      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker01.address, DEPOSIT_AMOUNT);

      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, pancakeswapWorker02.address, DEPOSIT_AMOUNT);

      // Transfer previously minted CAKE to the workers (simulate harvesting CAKE from staking pool)
      await cake.transfer(pancakeswapWorker01.address, ethers.utils.parseEther("2"));

      await pancakeswapWorker01.harvestRewards();

      await cake.transfer(pancakeswapWorker02.address, ethers.utils.parseEther("2"));

      await pancakeswapWorker02.harvestRewards();

      // Some cake should have been registered
      expect((await vault.rewards(1)).toString()).to.be.not.eql(parseEther("0").toString());
      expect((await vault.rewards(2)).toString()).to.be.not.eql(parseEther("0").toString());

      expect(await feeCollector.fees(exampleClient.address)).to.be.bignumber.that.is.not.eql(
        ethers.BigNumber.from("0")
      );
      expect(
        await feeCollector.fees(await vaultConfig.treasuryAccount())
      ).to.be.bignumber.that.is.not.eql(ethers.BigNumber.from("0"));

      // 2 CAKE + 2 CAKE harvested = 4 CAKE = 40 BASE TOKEN
      // 40 BASE TOKEN - 15 % (10% treasury fee + 5% client fee) = 34 BASE TOKEN + some additional rewards generated during execute test
      expect(
        (await exampleClient.allRewardToCollect(aliceAddress, baseToken.address)).toString()
      ).to.be.eq(parseEther("34.820649428128021984"));

      await exampleClient.collectAllRewards(aliceAddress, baseToken.address);

      expect((await baseToken.balanceOf(aliceAddress)).toString()).to.be.eq(
        parseEther("34.820649428128021984").toString()
      );

      // Operator can collect fee from harvested rewards
      expect((await exampleClient.feeToCollect()).toString()).to.be.eq(
        parseEther("1.947955231928522143").toString()
      );

      await exampleClientAsOperator.collectFee(clientOperatorAddress);

      expect((await baseToken.balanceOf(clientOperatorAddress)).toString()).to.be.eq(
        parseEther("1.947955231928522143").toString()
      );
    });

    it("should revert transaction when user is not whitelisted", async () => {
      await exampleClientAsOperator.whitelistUsers([aliceAddress], false);

      expect(
        exampleClientAsAlice.collectAllRewards(aliceAddress, baseToken.address)
      ).to.be.revertedWith("ClientContract: Caller not whitelisted.");
    });
  });

  context("getName", () => {
    it("should return client name", async () => {
      expect(await exampleClient.getName()).to.be.eq("Binance Client");
    });
  });
});
