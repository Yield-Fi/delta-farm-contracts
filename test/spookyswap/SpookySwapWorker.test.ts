import { BigNumber, Signer } from "ethers";
import {
  SpookyToken,
  MockToken,
  MockToken__factory,
  ProtocolManager,
  SpookySwapMasterChef,
  SpookySwapStrategyAddToPoolWithBaseToken,
  SpookySwapStrategyAddToPoolWithoutBaseToken,
  SpookySwapStrategyLiquidate,
  SpookySwapWorker,
  UniswapV2Factory,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  UniswapV2Router02,
  SpookySwapMasterChef__factory,
  SpookySwapWorker__factory,
} from "../../typechain";
import { ethers, upgrades, waffle } from "hardhat";

import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  deployContract,
  deployProxyContract,
  deploySpookySwapStrategies,
  deployTokens,
  time,
} from "../helpers";
import { parseEther } from "@ethersproject/units";
import { SwapHelper } from "../helpers/swap";
import { MockWBNB } from "../../typechain";
import { assertAlmostEqual } from "../helpers/assert";
import { MockVault } from "../../typechain/MockVault";
import { deploySpookySwap } from "../helpers/deploySpookySwap";

chai.use(solidity);
const { expect } = chai;

describe("SpookySwapWorker", () => {
  const BOO_PER_BLOCK = parseEther("1.5");
  const DEFI_FEE_BPS = "100";

  let deployer: Signer;
  let deployerAddress: string;
  let account1: Signer;
  let account1Address: string;
  let account2: Signer;
  let account2Address: string;
  let admin: Signer;
  let adminAddress: string;

  let ProtocolManager: ProtocolManager;
  let MockVault: MockVault;
  let WorkerBUSD_TOK0: SpookySwapWorker;
  let WorkerTOK0_TOK1: SpookySwapWorker;
  let UniswapV2Factory: UniswapV2Factory;
  let SpookySwapMasterChef: SpookySwapMasterChef;
  let SpookySwapMasterChef__account1: SpookySwapMasterChef;
  let SpookySwapMasterChef__account2: SpookySwapMasterChef;
  let UniswapV2Router02: UniswapV2Router02;
  let SpookyToken: SpookyToken;

  let AddToPoolWithBaseToken: SpookySwapStrategyAddToPoolWithBaseToken;
  let AddToPoolWithoutBaseToken: SpookySwapStrategyAddToPoolWithoutBaseToken;
  let LiquidateStrategy: SpookySwapStrategyLiquidate;

  let BaseToken: MockToken;
  let BaseToken__account1: MockToken;
  let Token0: MockToken;
  let Token1: MockToken;
  let lpBUSD_TOK0__deployer: UniswapV2Pair;
  let lpBUSD_TOK0__account1: UniswapV2Pair;
  let lpBUSD_TOK0__account2: UniswapV2Pair;

  let lpTOK0_TOK1__deployer: UniswapV2Pair;

  let swapHelper: SwapHelper;

  async function fixture() {
    [deployer, account1, account2, admin] = await ethers.getSigners();
    [deployerAddress, account1Address, account2Address, adminAddress] = await Promise.all([
      deployer.getAddress(),
      account1.getAddress(),
      account2.getAddress(),
      admin.getAddress(),
    ]);

    ProtocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[deployerAddress, adminAddress]],
      deployer
    )) as ProtocolManager;

    await ProtocolManager.approveAdminContract(adminAddress);
    await ProtocolManager.approveHarvesters([deployerAddress], true);

    [BaseToken, Token0, Token1] = await deployTokens(
      [
        {
          name: "BASE",
          symbol: "BASE",
          holders: [
            {
              address: account1Address,
              amount: parseEther("100"),
            },
            {
              address: account2Address,
              amount: parseEther("100"),
            },
            {
              address: deployerAddress,
              amount: parseEther("2300000"),
            },
          ],
        },
        {
          name: "TOKEN1",
          symbol: "TOK1",
          holders: [
            {
              address: account1Address,
              amount: parseEther("100"),
            },
            {
              address: account2Address,
              amount: parseEther("100"),
            },
            {
              address: deployerAddress,
              amount: parseEther("2000000"),
            },
          ],
        },
        {
          name: "TOKEN2",
          symbol: "TOK2",
          holders: [
            {
              address: account1Address,
              amount: parseEther("100"),
            },
            {
              address: account2Address,
              amount: parseEther("100"),
            },
            {
              address: deployerAddress,
              amount: parseEther("2000000"),
            },
          ],
        },
      ],
      deployer
    );

    const MockWBNB = (await deployContract("MockWBNB", [], deployer)) as MockWBNB;

    await MockWBNB.mint(deployerAddress, ethers.utils.parseEther("1000000"));

    await ProtocolManager.setStables([MockWBNB.address]);

    MockVault = (await deployContract("MockVault", [BaseToken.address], deployer)) as MockVault;

    [UniswapV2Factory, UniswapV2Router02, SpookyToken, SpookySwapMasterChef] =
      await deploySpookySwap(
        MockWBNB,
        BOO_PER_BLOCK,
        [{ address: deployerAddress, amount: parseEther("200") }],
        deployer
      );

    await UniswapV2Factory.createPair(BaseToken.address, Token0.address);
    const lpBUSD_TOK0 = await UniswapV2Factory.getPair(BaseToken.address, Token0.address);
    lpBUSD_TOK0__deployer = UniswapV2Pair__factory.connect(lpBUSD_TOK0, deployer);

    await UniswapV2Factory.createPair(Token0.address, Token1.address);
    const lpTOK0_TOK1 = await UniswapV2Factory.getPair(Token0.address, Token1.address);
    lpTOK0_TOK1__deployer = UniswapV2Pair__factory.connect(lpTOK0_TOK1, deployer);

    await SpookySwapMasterChef.add(1, lpBUSD_TOK0__deployer.address);
    await SpookySwapMasterChef.add(1, lpTOK0_TOK1__deployer.address);

    [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, LiquidateStrategy] =
      await deploySpookySwapStrategies(UniswapV2Router02, deployer, ProtocolManager);

    const SpookySwapWorkerFactory = await ethers.getContractFactory("SpookySwapWorker", deployer);

    WorkerBUSD_TOK0 = (await upgrades.deployProxy(SpookySwapWorkerFactory, [
      "WorkerBUSD_TOK0",
      MockVault.address,
      BaseToken.address,
      SpookySwapMasterChef.address,
      UniswapV2Router02.address,
      1,
      [SpookyToken.address, MockWBNB.address, BaseToken.address],
      0,
      DEFI_FEE_BPS,
      ProtocolManager.address,
    ])) as SpookySwapWorker;

    await WorkerBUSD_TOK0.deployed();

    WorkerTOK0_TOK1 = (await upgrades.deployProxy(SpookySwapWorkerFactory, [
      "WorkerTOK0_TOK1",
      MockVault.address,
      BaseToken.address,
      SpookySwapMasterChef.address,
      UniswapV2Router02.address,
      2,
      [SpookyToken.address, MockWBNB.address, BaseToken.address],
      0,
      DEFI_FEE_BPS,
      ProtocolManager.address,
    ])) as SpookySwapWorker;

    await WorkerTOK0_TOK1.deployed();

    swapHelper = new SwapHelper(
      UniswapV2Factory.address,
      UniswapV2Router02.address,
      BigNumber.from(9975),
      BigNumber.from(10000),
      deployer
    );
    await swapHelper.addLiquidities([
      {
        token0: BaseToken,
        token1: Token0,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("100"),
      },
      {
        token0: SpookyToken,
        token1: MockWBNB,
        amount0desired: ethers.utils.parseEther("100"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: BaseToken,
        token1: MockWBNB,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: Token0,
        token1: MockWBNB,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: Token0,
        token1: Token1,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: BaseToken,
        token1: Token1,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
    ]);

    lpBUSD_TOK0__account1 = UniswapV2Pair__factory.connect(lpBUSD_TOK0, account1);
    lpBUSD_TOK0__account2 = UniswapV2Pair__factory.connect(lpBUSD_TOK0, account2);
    SpookySwapMasterChef__account1 = SpookySwapMasterChef__factory.connect(
      SpookySwapMasterChef.address,
      account1
    );
    SpookySwapMasterChef__account2 = SpookySwapMasterChef__factory.connect(
      SpookySwapMasterChef.address,
      account2
    );

    BaseToken__account1 = MockToken__factory.connect(BaseToken.address, account1);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  context("when base token is contained in pool", async () => {
    it("should has a correct token0 and token1 addresses", async () => {
      const result = [
        (await WorkerBUSD_TOK0.token0()).toLowerCase(),
        (await WorkerBUSD_TOK0.token1()).toLowerCase(),
      ];
      expect(result).to.include(BaseToken.address.toLowerCase());
      expect(result).to.include(Token0.address.toLowerCase());
    });

    it("should add, remove liquidity via strategies and harvest funds", async () => {
      const worker__deployer = SpookySwapWorker__factory.connect(WorkerBUSD_TOK0.address, deployer);

      await worker__deployer.setStrategies([
        AddToPoolWithBaseToken.address,
        AddToPoolWithoutBaseToken.address,
        LiquidateStrategy.address,
      ]);

      /// send 0.1 base token to the worker
      await BaseToken__account1.transfer(WorkerBUSD_TOK0.address, parseEther("0.1"));

      /// Initially the amount of tokens to receive from a given position should equal 0
      expect((await WorkerBUSD_TOK0.tokensToReceive(1)).toString()).to.eq(parseEther("0"));

      /// add liquidity to the pool via add base token only strategy
      await MockVault.executeTransaction(
        WorkerBUSD_TOK0.address,
        0,
        "work(uint256,bytes)",
        ethers.utils.defaultAbiCoder.encode(
          ["uint256", "bytes"],
          [
            1,
            ethers.utils.defaultAbiCoder.encode(
              ["address", "bytes"],
              [
                AddToPoolWithBaseToken.address,
                ethers.utils.defaultAbiCoder.encode(
                  ["address", "address", "uint256"],
                  [BaseToken.address, Token0.address, "0"]
                ),
              ]
            ),
          ]
        )
      );

      /// expected ~ 0.1 Base Token (minus some trading fee) ~ 0.099 BASE TOKEN
      assertAlmostEqual(
        (await WorkerBUSD_TOK0.tokensToReceive(1)).toString(),
        parseEther("0.099897510238727138").toString()
      );

      const latestBlock = await time.latestBlockNumber();

      await time.advanceBlockTo(latestBlock.add(1).toNumber()); /// + 1 BLOCK

      // Harvest rewards and send them to the operating vault in Base token
      await worker__deployer.harvestRewards(); /// + 1 BLOCK

      expect(await MockVault.rewards(1)).to.be.eq(parseEther("9.756649592554072839").toString());

      /*
      There are two positions in MasterChef with the same alloc points, so 0.5 SpookyToken per block is generated for the given position.
      2 BLOCK = 2 * 0.5 SpookyToken = 1 SpookyToken
      1 SpookyToken ~ 10 BASE TOKEN (without trading fee)
      10 BASE TOKEN - some trading fees ~ 9.75 BASE TOKEN
      */
      assertAlmostEqual(
        (await BaseToken.balanceOf(MockVault.address)).toString(),
        parseEther("9.755679966928919588").toString()
      );

      /// Withdraw all funds from pool via LiquidateStrategy
      await MockVault.executeTransaction(
        WorkerBUSD_TOK0.address,
        0,
        "work(uint256,bytes)",
        ethers.utils.defaultAbiCoder.encode(
          ["uint256", "bytes"],
          [
            1,
            ethers.utils.defaultAbiCoder.encode(
              ["address", "bytes"],
              [
                LiquidateStrategy.address,
                ethers.utils.defaultAbiCoder.encode(
                  ["address", "address", "address", "uint256", "address"],
                  [BaseToken.address, BaseToken.address, Token0.address, "0", MockVault.address]
                ),
              ]
            ),
          ]
        )
      );

      /*
      9.75 BASE TOKEN + 0.099 BASE TOKEN ~= 9.85 BASE TOKEN
      */

      assertAlmostEqual(
        (await BaseToken.balanceOf(MockVault.address)).toString(),
        parseEther("9.856522105162506480").toString()
      );
    });
  });
  context("when base token is not contained in pool", async () => {
    it("should has a correct token0 and token1 addresses", async () => {
      const result = [
        (await WorkerTOK0_TOK1.token0()).toLowerCase(),
        (await WorkerTOK0_TOK1.token1()).toLowerCase(),
      ];
      expect(result).to.include(Token0.address.toLowerCase());
      expect(result).to.include(Token1.address.toLowerCase());
    });

    it("should add, remove liquidity via strategies and harvest funds", async () => {
      const worker__deployer = SpookySwapWorker__factory.connect(WorkerTOK0_TOK1.address, deployer);

      await worker__deployer.setStrategies([
        AddToPoolWithBaseToken.address,
        AddToPoolWithoutBaseToken.address,
        LiquidateStrategy.address,
      ]);

      /// send 0.1 base token to the worker
      await BaseToken__account1.transfer(WorkerTOK0_TOK1.address, parseEther("0.1"));

      /// Initially the amount of tokens to receive from a given position should equal 0
      expect((await WorkerTOK0_TOK1.tokensToReceive(1)).toString()).to.eq(parseEther("0"));

      /// add liquidity to the pool via add base token only strategy
      await MockVault.executeTransaction(
        WorkerTOK0_TOK1.address,
        0,
        "work(uint256,bytes)",
        ethers.utils.defaultAbiCoder.encode(
          ["uint256", "bytes"],
          [
            1,
            ethers.utils.defaultAbiCoder.encode(
              ["address", "bytes"],
              [
                AddToPoolWithoutBaseToken.address,
                ethers.utils.defaultAbiCoder.encode(
                  ["address", "address", "address", "uint256"],
                  [BaseToken.address, Token0.address, Token1.address, "0"]
                ),
              ]
            ),
          ]
        )
      );

      /// expected ~ 0.1 Base Token (minus some trading fee) ~ 0.099 BASE TOKEN
      assertAlmostEqual(
        (await WorkerTOK0_TOK1.tokensToReceive(1)).toString(),
        parseEther("0.099541490260089368").toString()
      );

      const latestBlock = await time.latestBlockNumber();

      await time.advanceBlockTo(latestBlock.add(1).toNumber()); /// + 1 BLOCK

      // Harvest rewards and send them to the operating vault in Base token
      await worker__deployer.harvestRewards(); /// + 1 BLOCK

      /*
      There are two positions in MasterChef with the same alloc points, so 0.5 SpookyToken per block is generated for the given position.
      2 BLOCK = 2 * 0.5 SpookyToken = 1 SpookyToken
      1 SpookyToken ~ 10 BASE TOKEN (without trading fee)
      10 BASE TOKEN - some trading fees ~ 9.75 BASE TOKEN
      */
      assertAlmostEqual(
        (await BaseToken.balanceOf(MockVault.address)).toString(),
        parseEther("9.757442958099992462").toString()
      );

      /// Withdraw all funds from pool via LiquidateStrategy
      await MockVault.executeTransaction(
        WorkerTOK0_TOK1.address,
        0,
        "work(uint256,bytes)",
        ethers.utils.defaultAbiCoder.encode(
          ["uint256", "bytes"],
          [
            1,
            ethers.utils.defaultAbiCoder.encode(
              ["address", "bytes"],
              [
                LiquidateStrategy.address,
                ethers.utils.defaultAbiCoder.encode(
                  ["address", "address", "address", "uint256", "address"],
                  [BaseToken.address, Token0.address, Token1.address, "0", MockVault.address]
                ),
              ]
            ),
          ]
        )
      );

      /*
      9.75 BASE TOKEN + 0.099 BASE TOKEN ~= 9.85 BASE TOKEN
      */

      assertAlmostEqual(
        (await BaseToken.balanceOf(MockVault.address)).toString(),
        parseEther("9.856934582015493050").toString()
      );
    });
  });

  it("should give rewards out when you stake LP tokens", async () => {
    // Distribute lp tokens to the accounts
    await lpBUSD_TOK0__deployer.transfer(account1Address, parseEther("0.1"));
    await lpBUSD_TOK0__deployer.transfer(account2Address, parseEther("0.1"));

    // Staking 0.1 Lp tokens by account 1 and account 2
    await lpBUSD_TOK0__account1.approve(SpookySwapMasterChef.address, parseEther("0.1"));
    await lpBUSD_TOK0__account2.approve(SpookySwapMasterChef.address, parseEther("0.1"));
    await SpookySwapMasterChef__account1.deposit(1, parseEther("0.1"));
    await SpookySwapMasterChef__account2.deposit(1, parseEther("0.1")); // account 1 + 1 / 2 SpookyToken

    await SpookySwapMasterChef__account1.withdraw(1, parseEther("0.1")); // account 1 + 1 / 4 SpookyToken

    // 3/4 * 2/3 (spooky token for masterchefV1) = 1/2 * Boo per block
    expect((await SpookyToken.balanceOf(account1Address)).toString()).to.be.eq(
      BOO_PER_BLOCK.div(2).toString()
    );
  });

  it("should successfully set a treasury config", async () => {
    const worker__admin = WorkerTOK0_TOK1.connect(admin);

    await worker__admin.setTreasuryFee("500");
    expect(await WorkerTOK0_TOK1.treasuryFeeBps()).to.eq("500");
  });

  it("should return proper reward token", async () => {
    const rewardToken = await WorkerBUSD_TOK0.getRewardToken();

    expect(rewardToken).to.be.eql(SpookyToken.address);
  });
});
