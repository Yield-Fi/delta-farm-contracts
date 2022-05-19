import { BigNumber, constants, Signer } from "ethers";
import {
  MockToken,
  MockToken__factory,
  ProtocolManager,
  SpookySwapMasterChefV2,
  SpookySwapStrategyAddToPoolWithBaseToken,
  SpookySwapStrategyAddToPoolWithoutBaseToken,
  SpookySwapStrategyLiquidate,
  SpookySwapWorkerV2,
  SpookySwapWorkerV2__factory,
  SpookyToken,
  UniswapV2Factory,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  UniswapV2Router02,
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

describe("SpookySwapWorkerV2", () => {
  const BOO_PER_BLOCK = parseEther("1");
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
  let WorkerBUSD_TOK0: SpookySwapWorkerV2;
  let WorkerTOK0_TOK1: SpookySwapWorkerV2;
  let UniswapV2Factory: UniswapV2Factory;
  let MasterChefV2: SpookySwapMasterChefV2;
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

    [UniswapV2Factory, UniswapV2Router02, SpookyToken, , MasterChefV2] = await deploySpookySwap(
      MockWBNB,
      BOO_PER_BLOCK,
      [{ address: deployerAddress, amount: parseEther("200000") }],
      deployer
    );

    await UniswapV2Factory.createPair(BaseToken.address, Token0.address);
    const lpBUSD_TOK0 = await UniswapV2Factory.getPair(BaseToken.address, Token0.address);
    lpBUSD_TOK0__deployer = UniswapV2Pair__factory.connect(lpBUSD_TOK0, deployer);

    await UniswapV2Factory.createPair(Token0.address, Token1.address);
    const lpTOK0_TOK1 = await UniswapV2Factory.getPair(Token0.address, Token1.address);
    lpTOK0_TOK1__deployer = UniswapV2Pair__factory.connect(lpTOK0_TOK1, deployer);

    await MasterChefV2.add(1, lpBUSD_TOK0__deployer.address, constants.AddressZero, true);
    await MasterChefV2.add(1, lpTOK0_TOK1__deployer.address, constants.AddressZero, true);

    [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, LiquidateStrategy] =
      await deploySpookySwapStrategies(UniswapV2Router02, deployer, ProtocolManager);

    const SpookySwapWorkerV2Factory = await ethers.getContractFactory(
      "SpookySwapWorkerV2",
      deployer
    );

    WorkerBUSD_TOK0 = (await upgrades.deployProxy(SpookySwapWorkerV2Factory, [
      "WorkerBUSD_TOK0",
      MockVault.address,
      BaseToken.address,
      MasterChefV2.address,
      UniswapV2Router02.address,
      0,
      [SpookyToken.address, MockWBNB.address, BaseToken.address],
      0,
      DEFI_FEE_BPS,
      ProtocolManager.address,
    ])) as SpookySwapWorkerV2;

    await WorkerBUSD_TOK0.deployed();

    WorkerTOK0_TOK1 = (await upgrades.deployProxy(SpookySwapWorkerV2Factory, [
      "WorkerTOK0_TOK1",
      MockVault.address,
      BaseToken.address,
      MasterChefV2.address,
      UniswapV2Router02.address,
      1,
      [SpookyToken.address, MockWBNB.address, BaseToken.address],
      0,
      DEFI_FEE_BPS,
      ProtocolManager.address,
    ])) as SpookySwapWorkerV2;

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
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: SpookyToken,
        token1: MockWBNB,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
      {
        token0: BaseToken,
        token1: MockWBNB,
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
      {
        token0: Token0,
        token1: MockWBNB,
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
      {
        token0: Token0,
        token1: Token1,
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
      {
        token0: BaseToken,
        token1: Token1,
        amount0desired: ethers.utils.parseEther("10000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
    ]);

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
      const worker__deployer = SpookySwapWorkerV2__factory.connect(
        WorkerBUSD_TOK0.address,
        deployer
      );

      await worker__deployer.setStrategies([
        AddToPoolWithBaseToken.address,
        AddToPoolWithoutBaseToken.address,
        LiquidateStrategy.address,
      ]);

      /// send 0.1 base token to the worker
      await BaseToken__account1.transfer(WorkerBUSD_TOK0.address, parseEther("10"));

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

      /// expected ~ 10 Base Token (minus some trading fee) ~ 9.9 BASE TOKEN
      assertAlmostEqual(
        (await WorkerBUSD_TOK0.tokensToReceive(1)).toString(),
        parseEther("9.987512475037437585").toString()
      );

      const latestBlock = await time.latestBlockNumber();

      await time.advanceBlockTo(latestBlock.add(1).toNumber()); /// + 1 BLOCK

      // Harvest rewards and send them to the operating vault in Base token
      await worker__deployer.harvestRewards(); /// + 1 BLOCK

      /*
      SpookySwap MasterChefV2 generates 1 BOO per block
      There are two positions in MasterChef with the same alloc points, so 0.5 BOO per block is generated for the given position.
      2 BLOCK = 2 * 0.5 BOO = 1 BOO
      1 BOO ~ 10 BASE TOKEN (without trading fee)
      10 BASE TOKEN - some trading fees ~ 9.94 BASE TOKEN
      */
      expect(await MockVault.rewards(1)).to.be.eq(parseEther("9.940191779048852998").toString());
      assertAlmostEqual(
        (await BaseToken.balanceOf(MockVault.address)).toString(),
        parseEther("9.940191779048852998").toString()
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
      9.9 BASE TOKEN + 9.94 BASE TOKEN ~= 19.925205503453806013
      */

      assertAlmostEqual(
        (await BaseToken.balanceOf(MockVault.address)).toString(),
        parseEther("19.925205503453806013").toString()
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
      const worker__deployer = SpookySwapWorkerV2__factory.connect(
        WorkerTOK0_TOK1.address,
        deployer
      );

      await worker__deployer.setStrategies([
        AddToPoolWithBaseToken.address,
        AddToPoolWithoutBaseToken.address,
        LiquidateStrategy.address,
      ]);

      /// send 10 base token to the worker
      await BaseToken__account1.transfer(WorkerTOK0_TOK1.address, parseEther("10"));

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

      /// expected ~ 10 Base Token (minus some trading fee) ~ 9.9 BASE TOKEN
      assertAlmostEqual(
        (await WorkerTOK0_TOK1.tokensToReceive(1)).toString(),
        parseEther("9.946048326147015216").toString()
      );

      const latestBlock = await time.latestBlockNumber();

      await time.advanceBlockTo(latestBlock.add(1).toNumber()); /// + 1 BLOCK

      // Harvest rewards and send them to the operating vault in Base token
      await worker__deployer.harvestRewards(); /// + 1 BLOCK

      /*
      There are two positions in SpookySwap MasterChef with the same alloc points, so 0.5 BOO per block is generated for the given position.
      2 BLOCK = 2 * 0.5 BOO = 1 BOO
      1 BOO ~ 10 BASE TOKEN (without trading fee)
      10 BASE TOKEN - some trading fees ~ 9.94 BASE TOKEN
      */
      assertAlmostEqual(
        (await BaseToken.balanceOf(MockVault.address)).toString(),
        parseEther("9.948308069316308481").toString()
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
      9.94 BASE TOKEN + 9.9 BASE TOKEN ~= 19.88 BASE TOKEN
      */
      assertAlmostEqual(
        (await BaseToken.balanceOf(MockVault.address)).toString(),
        parseEther("19.889377539493310647").toString()
      );
    });
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
