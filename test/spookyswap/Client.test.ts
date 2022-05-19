import "@openzeppelin/test-helpers";

import { BigNumber, constants, Signer } from "ethers";
import {
  FeeCollector,
  MockWBNB,
  Vault,
  VaultConfig,
  Client,
  ProtocolManager,
  UniswapV2Factory,
  UniswapV2Router02,
  SpookySwapMasterChefV2,
  SpookySwapWorkerV2,
  UniswapV2Pair__factory,
  SpookySwapStrategyAddToPoolWithBaseToken,
  SpookySwapStrategyAddToPoolWithoutBaseToken,
  SpookySwapStrategyLiquidate,
  UniswapV2Pair,
  SpookyToken,
} from "../../typechain";
import { ethers, upgrades, waffle } from "hardhat";
import { deployToken, deployWBNB } from "../helpers/deployToken";

import { MockToken } from "../../typechain/MockToken";
import { SwapHelper } from "../helpers/swap";
import chai from "chai";
import { deployProxyContract, deploySpookySwapStrategies } from "../helpers";
import { deployVault } from "../helpers/deployVault";
import { solidity } from "ethereum-waffle";
import { assertAlmostEqual } from "../helpers/assert";
import { parseEther } from "@ethersproject/units";
import { deploySpookySwap } from "../helpers/deploySpookySwap";

chai.use(solidity);
const { expect } = chai;
describe("Client contract integrated with spookyswap protocol", async () => {
  const POOL_ID = 0;
  const BOO_PER_BLOCK = parseEther("1");
  const REINVEST_BOUNTY_BPS = "100";

  let factory: UniswapV2Factory;
  let router: UniswapV2Router02;
  let masterChef: SpookySwapMasterChefV2;
  let spookySwapWorker01: SpookySwapWorkerV2;
  let spookySwapWorker02: SpookySwapWorkerV2;
  let lp: UniswapV2Pair;
  let lpExt: UniswapV2Pair;
  let mockWBNB: MockWBNB;

  // Tokens
  let baseToken: MockToken;
  let targetToken: MockToken;
  let testToken: MockToken;
  let boo: SpookyToken;

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
  let addStrat: SpookySwapStrategyAddToPoolWithBaseToken;
  let addStratNoBase: SpookySwapStrategyAddToPoolWithoutBaseToken;
  let liqStrat: SpookySwapStrategyLiquidate;

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
        holders: [{ address: deployerAddress, amount: ethers.utils.parseEther("1000000") }],
      },
      deployer
    );

    targetToken = await deployToken(
      {
        name: "TARGETTOKEN",
        symbol: "TTOKEN",
        holders: [{ address: deployerAddress, amount: ethers.utils.parseEther("1000000") }],
      },
      deployer
    );

    testToken = await deployToken(
      {
        name: "TESTTOKEN",
        symbol: "TSTOKEN",
        holders: [{ address: deployerAddress, amount: ethers.utils.parseEther("1000000") }],
      },
      deployer
    );

    mockWBNB = await deployWBNB(deployer);

    await mockWBNB.mint(deployerAddress, ethers.utils.parseEther("1000000"));

    [factory, router, boo, , masterChef] = await deploySpookySwap(
      mockWBNB,
      BOO_PER_BLOCK,
      [{ address: deployerAddress, amount: ethers.utils.parseEther("1000000") }],
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
    [addStrat, addStratNoBase, liqStrat] = await deploySpookySwapStrategies(
      router,
      deployer,
      protocolManager
    );

    // Setup BTOKEN-FTOKEN pair on Pancakeswap
    // Add lp to masterChef's pool
    await factory.createPair(baseToken.address, targetToken.address);
    await factory.createPair(testToken.address, targetToken.address);
    lp = UniswapV2Pair__factory.connect(
      await factory.getPair(targetToken.address, baseToken.address),
      deployer
    );

    lpExt = UniswapV2Pair__factory.connect(
      await factory.getPair(targetToken.address, testToken.address),
      deployer
    );

    await masterChef.add(1, lp.address, constants.AddressZero, true);
    await masterChef.add(2, lpExt.address, constants.AddressZero, true);

    const SpookySwapWorkerV2Factory = await ethers.getContractFactory(
      "SpookySwapWorkerV2",
      deployer
    );

    /// Setup SpookySwapWorkerV2
    spookySwapWorker01 = (await upgrades.deployProxy(SpookySwapWorkerV2Factory, [
      "Worker01",
      vault.address,
      baseToken.address,
      masterChef.address,
      router.address,
      POOL_ID,
      [boo.address, mockWBNB.address, baseToken.address],
      0,
      REINVEST_BOUNTY_BPS,
      protocolManager.address,
    ])) as SpookySwapWorkerV2;

    spookySwapWorker02 = (await upgrades.deployProxy(SpookySwapWorkerV2Factory, [
      "Worker02",
      vault.address,
      baseToken.address,
      masterChef.address,
      router.address,
      POOL_ID + 1, // Next alloc point
      [boo.address, mockWBNB.address, baseToken.address],
      0,
      REINVEST_BOUNTY_BPS,
      protocolManager.address,
    ])) as SpookySwapWorkerV2;

    await spookySwapWorker01.setStrategies([
      addStrat.address,
      addStratNoBase.address,
      liqStrat.address,
    ]);
    await spookySwapWorker02.setStrategies([
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
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
      {
        token0: boo,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
      {
        token0: baseToken,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
      {
        token0: targetToken,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
      {
        token0: testToken,
        token1: mockWBNB,
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
      {
        token0: testToken,
        token1: baseToken,
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
      {
        token0: testToken,
        token1: targetToken,
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
    ]);

    // Add worker to the register
    await protocolManager.approveWorkers(
      [spookySwapWorker01.address, spookySwapWorker02.address],
      true
    );

    // Clients
    exampleClient = (await deployProxyContract(
      "Client",
      [
        "CLIENT",
        "Client",
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
      spookySwapWorker01.address,
      spookySwapWorker02.address,
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
      await exampleClientAsAlice.deposit(aliceAddress, spookySwapWorker01.address, DEPOSIT_AMOUNT);

      // ID 1 = first position within the vault
      const position = await vault.positions(1);
      const positionInfo = await vault.positionInfo(1);

      // Validate position info
      expect(position.worker).to.be.eql(spookySwapWorker01.address);
      expect(position.owner).to.be.eql(aliceAddress);
      expect(position.client).to.be.eql(exampleClient.address);

      // Position opened for 1 BASETOKEN initially; subtract swap fees and here we go with ~ 0.996527550599874237;
      expect(positionInfo.toString()).to.be.eql(
        ethers.utils.parseEther("0.996527550599874237").toString()
      );
    });

    it("should revert if target work is disabled by client", async () => {
      // Disable worker
      await exampleClientAsOperator.disableFarms([spookySwapWorker01.address]);

      expect(await exampleClient.isFarmEnabled(spookySwapWorker01.address)).to.be.false;

      // Proceed with entering the protocol
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await exampleClientAsOperator.whitelistUsers([aliceAddress], true);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await expect(
        exampleClientAsAlice.deposit(aliceAddress, spookySwapWorker01.address, DEPOSIT_AMOUNT)
      ).to.be.revertedWith("ClientContract: Target farm hasn't been enabled by the client");
    });

    it("should estimate deposit correctly", async () => {
      const [firstPartOfBaseToken, secondPartOfBaseToken, amountOfToken0, amountOfToken1] =
        await exampleClient.callStatic.estimateDeposit(spookySwapWorker01.address, parseEther("2"));

      expect(firstPartOfBaseToken.toString()).to.be.eq(
        parseEther("1.000000000000000000").toString(),
        "firstPartOfBaseToken not eq 1 ETH"
      );
      expect(secondPartOfBaseToken.toString()).to.be.eq(
        parseEther("1.000000000000000000").toString(),
        "secondPartOfBaseToken not eq 1 ETH"
      );
      expect(firstPartOfBaseToken.add(secondPartOfBaseToken).toString()).to.be.eq(
        parseEther("2").toString(),
        "first + second not eq 2 ETH"
      );
      expect(amountOfToken0.toString()).to.be.oneOf(
        [
          parseEther("0.997900409539127995").toString(),
          parseEther("1.0000000000000000000").toString(),
        ],
        "amountOfToken0 not eq ~1 ETH"
      );
      expect(amountOfToken1.toString()).to.be.oneOf(
        [
          parseEther("0.997900409539127995").toString(),
          parseEther("1.0000000000000000000").toString(),
        ],
        "amountOfToken1 not eq ~1 ETH"
      );
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
      await exampleClientAsAlice.deposit(aliceAddress, spookySwapWorker02.address, DEPOSIT_AMOUNT);

      // ID 1 = first position within the vault
      const position = await vault.positions(1);
      const positionInfo = await vault.positionInfo(1);

      // Validate position info
      expect(position.worker).to.be.eql(spookySwapWorker02.address);
      expect(position.owner).to.be.eql(aliceAddress);
      expect(position.client).to.be.eql(exampleClient.address);

      // Position opened for 1 BASETOKEN initially; subtract swap fees and here we go with ~ 0.995505223728612600 (due to liquidity ratios) [1 BT -> TST -> TT];
      assertAlmostEqual(
        positionInfo.toString(),
        ethers.utils.parseEther("0.995505223728612600").toString()
      );
    });

    it("should revert transaction when user is not whitelisted", async () => {
      await exampleClientAsOperator.whitelistUsers([aliceAddress], false);

      expect(
        exampleClientAsAlice.deposit(aliceAddress, spookySwapWorker02.address, 100)
      ).to.be.revertedWith("ClientContract: Caller not whitelisted.");
    });

    it("should estimate deposit correctly", async () => {
      const [firstPartOfBaseToken, secondPartOfBaseToken, amountOfToken0, amountOfToken1] =
        await exampleClient.callStatic.estimateDeposit(spookySwapWorker02.address, parseEther("2"));

      expect(firstPartOfBaseToken.toString()).to.be.eq(parseEther("1").toString());
      expect(secondPartOfBaseToken.toString()).to.be.eq(parseEther("1").toString());
      expect(firstPartOfBaseToken.add(secondPartOfBaseToken).toString()).to.be.eq(
        parseEther("2").toString()
      );
      expect(amountOfToken0.toString()).to.be.eq(parseEther("0.997900409539127995").toString());
      expect(amountOfToken1.toString()).to.be.eq(parseEther("0.997900409539127995").toString());
    });
  });

  context("withdraw method", async () => {
    it("should execute withdrawal flow on behalf of given end user", async () => {
      // Same stuff above
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await exampleClientAsOperator.whitelistUsers([aliceAddress], true);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, spookySwapWorker01.address, DEPOSIT_AMOUNT);

      // Alice entered protocol with 1 BASE TOKEN and now her wallet is empty
      expect(await baseToken.balanceOf(aliceAddress)).to.be.bignumber.that.is.eql(
        ethers.utils.parseEther("0")
      );

      expect(
        (await exampleClient.amountToWithdraw(spookySwapWorker01.address, aliceAddress)).toString()
      ).to.be.eq(parseEther("0.996527550599874237").toString());

      // Execute withdrawal flow
      await exampleClientAsAlice.withdraw(aliceAddress, spookySwapWorker01.address, 0);

      // Alice received ~= 1 base token after withdraw
      expect((await baseToken.balanceOf(aliceAddress)).toString()).to.be.eql(
        ethers.utils.parseEther("0.996278186714131827").toString()
      );
    });

    it("should revert transaction when user is not whitelisted", async () => {
      await exampleClientAsOperator.whitelistUsers([aliceAddress], false);

      expect(
        exampleClientAsAlice.withdraw(aliceAddress, spookySwapWorker01.address, 100)
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
        exampleClientAsOperator.setFarmsFee([spookySwapWorker01.address], 10001)
      ).to.be.revertedWith("ClientContract: Invalid fee amount given");
    });

    it("should work if provided fee is valid and view functions return correct fee's data", async () => {
      await exampleClientAsOperator.setFarmsFee([spookySwapWorker01.address], 500);

      expect(
        await exampleClient.getFarmClientFee(spookySwapWorker01.address)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from(500));

      await protocolManager.approveAdminContract(deployerAddress); // Workaround
      await spookySwapWorker01.setTreasuryFee(1000);
      // + 10% treasury fee
      expect(
        await exampleClient.getFarmFee(spookySwapWorker01.address)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from(1500));
    });

    it("should revert transaction when operator is not whitelisted", async () => {
      await exampleClientAsOperator.whitelistOperators([aliceAddress], false);

      expect(
        exampleClientAsAlice.setFarmsFee([spookySwapWorker01.address], 100)
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
        [spookySwapWorker01.address, spookySwapWorker02.address],
        true
      );
      await protocolManager.approveAdminContract(deployerAddress); // Workaround
      await protocolManager.approveHarvesters([deployerAddress], true);
      await spookySwapWorker01.setTreasuryFee(1000); // 10% for the protocol owner
      await exampleClientAsOperator.setFarmsFee([spookySwapWorker01.address], 500); // 10% for the client
      await exampleClientAsOperator.whitelistUsers([deployerAddress], true);

      // Open some positions
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await exampleClientAsOperator.whitelistUsers([aliceAddress, bobAddress], true);

      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT);
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsAlice.deposit(aliceAddress, spookySwapWorker01.address, DEPOSIT_AMOUNT);

      await baseToken.mint(bobAddress, DEPOSIT_AMOUNT);
      await baseTokenAsBob.approve(exampleClient.address, DEPOSIT_AMOUNT);
      await exampleClientAsBob.deposit(bobAddress, spookySwapWorker01.address, DEPOSIT_AMOUNT);

      // Empty positions
      expect(
        await exampleClient.rewardToCollect(spookySwapWorker01.address, aliceAddress)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));
      expect(
        await exampleClient.rewardToCollect(spookySwapWorker01.address, bobAddress)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));

      // Transfer previously minted BOO to the worker (simulate harvesting BOO from staking pool)
      await boo.transfer(spookySwapWorker01.address, ethers.utils.parseEther("10"));

      await spookySwapWorker01.harvestRewards();

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
      await exampleClient.collectReward(spookySwapWorker01.address, aliceAddress);
      await exampleClient.collectReward(spookySwapWorker01.address, bobAddress);

      // Position have been emptied out
      expect(
        await exampleClient.rewardToCollect(spookySwapWorker01.address, aliceAddress)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));
      expect(
        await exampleClient.rewardToCollect(spookySwapWorker01.address, bobAddress)
      ).to.be.bignumber.that.is.eql(ethers.BigNumber.from("0"));
    });
  });

  context("Collect all rewards", () => {
    it("should work as intended and collect fee", async () => {
      // Approvals
      await protocolManager.approveClients([exampleClient.address], true);
      await protocolManager.approveBountyCollectors([feeCollector.address], true);
      await protocolManager.approveVaults([vault.address], true);
      await protocolManager.approveWorkers(
        [spookySwapWorker01.address, spookySwapWorker02.address],
        true
      );
      await protocolManager.approveAdminContract(deployerAddress); // Workaround
      await protocolManager.approveHarvesters([deployerAddress], true);
      await spookySwapWorker01.setTreasuryFee(1000); // 10% for the protocol owner
      await spookySwapWorker02.setTreasuryFee(1000); // 10% for the protocol owner
      await exampleClientAsOperator.setFarmsFee(
        [spookySwapWorker01.address, spookySwapWorker02.address],
        500
      ); // 5% for the client
      await exampleClientAsOperator.whitelistUsers([deployerAddress], true);

      // Open two positions on two different farms
      const DEPOSIT_AMOUNT = ethers.utils.parseEther("1");
      await exampleClientAsOperator.whitelistUsers([aliceAddress], true);

      await baseToken.mint(aliceAddress, DEPOSIT_AMOUNT.mul(2));
      await baseTokenAsAlice.approve(exampleClient.address, DEPOSIT_AMOUNT.mul(2));

      await exampleClientAsAlice.deposit(aliceAddress, spookySwapWorker01.address, DEPOSIT_AMOUNT);
      // + 1/3 * BOO PER BLOCK = 0.333 (1 alloc point of worker01's farm)

      await exampleClientAsAlice.deposit(aliceAddress, spookySwapWorker02.address, DEPOSIT_AMOUNT);
      // + 3/3 * BOO PER BLOCK = 1 (1 alloc point of worker01's farm + 2 alloc points of worker02's farm)

      await spookySwapWorker01.harvestRewards();
      // + 2/3 * BOO PER BLOCK = 0.666 (2 alloc points)

      await spookySwapWorker02.harvestRewards();

      // Some cake should have been registered
      expect((await vault.rewards(1)).toString()).to.be.not.eql(parseEther("0").toString());
      expect((await vault.rewards(2)).toString()).to.be.not.eql(parseEther("0").toString());

      expect(await feeCollector.fees(exampleClient.address)).to.be.bignumber.that.is.not.eql(
        ethers.BigNumber.from("0")
      );
      expect(
        await feeCollector.fees(await vaultConfig.treasuryAccount())
      ).to.be.bignumber.that.is.not.eql(ethers.BigNumber.from("0"));

      // SpookySwap MasterChefV2 generates ~ 2 BOO ~= 20 BASE TOKEN
      // 20 BASE TOKEN - 15 % (10% treasury fee + 5% client fee) = 17 BASE TOKEN - some trading fees
      expect(
        (await exampleClient.allRewardToCollect(aliceAddress, baseToken.address)).toString()
      ).to.be.eq(parseEther("16.847929659097574329"));

      await exampleClient.collectAllRewards(aliceAddress, baseToken.address);

      expect((await baseToken.balanceOf(aliceAddress)).toString()).to.be.eq(
        parseEther("16.847929659097574329").toString()
      );

      // Client can collect fee from harvested rewards 20 BASE TOKEN * 5% ~= 1 BASE TOKEN - some trading fees
      expect((await exampleClient.feeToCollect()).toString()).to.be.eq(
        parseEther("0.991054685829269078").toString()
      );

      await exampleClientAsOperator.collectFee(clientOperatorAddress);

      expect((await baseToken.balanceOf(clientOperatorAddress)).toString()).to.be.eq(
        parseEther("0.991054685829269078").toString()
      );
    });
  });
});
