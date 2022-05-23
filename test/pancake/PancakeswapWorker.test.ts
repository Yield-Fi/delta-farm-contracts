import { BigNumber, Signer } from "ethers";
import {
  CakeToken,
  MockToken,
  MockToken__factory,
  PancakeFactory,
  PancakeMasterChef,
  PancakeMasterChef__factory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  PancakeswapStrategyAddToPoolWithBaseToken,
  PancakeswapStrategyAddToPoolWithoutBaseToken,
  PancakeswapStrategyLiquidate,
  PancakeswapWorker,
  PancakeswapWorker__factory,
  ProtocolManager,
} from "../../typechain";
import { ethers, upgrades, waffle } from "hardhat";

import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  deployContract,
  deployPancakeStrategies,
  deployPancake,
  deployProxyContract,
  deployTokens,
  time,
} from "../helpers";
import { parseEther } from "@ethersproject/units";
import { SwapHelper } from "../helpers/swap";
import { MockWBNB } from "../../typechain";
import { assertAlmostEqual } from "../helpers/assert";
import { MockVault } from "../../typechain/MockVault";

chai.use(solidity);
const { expect } = chai;

describe("PancakeswapWorker", () => {
  const CAKE_PER_BLOCK = parseEther("1");
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
  let WorkerBUSD_TOK0: PancakeswapWorker;
  let WorkerTOK0_TOK1: PancakeswapWorker;
  let PancakeFactory: PancakeFactory;
  let PancakeMasterChef: PancakeMasterChef;
  let PancakeMasterChef__account1: PancakeMasterChef;
  let PancakeMasterChef__account2: PancakeMasterChef;
  let PancakeRouterV2: PancakeRouterV2;
  let CakeToken: CakeToken;

  let AddToPoolWithBaseToken: PancakeswapStrategyAddToPoolWithBaseToken;
  let AddToPoolWithoutBaseToken: PancakeswapStrategyAddToPoolWithoutBaseToken;
  let LiquidateStrategy: PancakeswapStrategyLiquidate;

  let BaseToken: MockToken;
  let BaseToken__account1: MockToken;
  let Token0: MockToken;
  let Token1: MockToken;
  let lpBUSD_TOK0__deployer: PancakePair;
  let lpBUSD_TOK0__account1: PancakePair;
  let lpBUSD_TOK0__account2: PancakePair;

  let lpTOK0_TOK1__deployer: PancakePair;

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

    [PancakeFactory, PancakeRouterV2, CakeToken, , PancakeMasterChef] = await deployPancake(
      MockWBNB,
      CAKE_PER_BLOCK,
      [{ address: deployerAddress, amount: parseEther("200") }],
      deployer
    );

    await PancakeFactory.createPair(BaseToken.address, Token0.address);
    const lpBUSD_TOK0 = await PancakeFactory.getPair(BaseToken.address, Token0.address);
    lpBUSD_TOK0__deployer = PancakePair__factory.connect(lpBUSD_TOK0, deployer);

    await PancakeFactory.createPair(Token0.address, Token1.address);
    const lpTOK0_TOK1 = await PancakeFactory.getPair(Token0.address, Token1.address);
    lpTOK0_TOK1__deployer = PancakePair__factory.connect(lpTOK0_TOK1, deployer);

    await PancakeMasterChef.add(1, lpBUSD_TOK0__deployer.address, true);
    await PancakeMasterChef.add(1, lpTOK0_TOK1__deployer.address, true);

    [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, LiquidateStrategy] =
      await deployPancakeStrategies(PancakeRouterV2, deployer, ProtocolManager);

    const PancakeswapWorkerFactory = await ethers.getContractFactory("PancakeswapWorker", deployer);

    WorkerBUSD_TOK0 = (await upgrades.deployProxy(PancakeswapWorkerFactory, [
      "WorkerBUSD_TOK0",
      MockVault.address,
      BaseToken.address,
      PancakeMasterChef.address,
      PancakeRouterV2.address,
      1,
      [CakeToken.address, MockWBNB.address, BaseToken.address],
      0,
      DEFI_FEE_BPS,
      ProtocolManager.address,
    ])) as PancakeswapWorker;

    await WorkerBUSD_TOK0.deployed();

    WorkerTOK0_TOK1 = (await upgrades.deployProxy(PancakeswapWorkerFactory, [
      "WorkerTOK0_TOK1",
      MockVault.address,
      BaseToken.address,
      PancakeMasterChef.address,
      PancakeRouterV2.address,
      2,
      [CakeToken.address, MockWBNB.address, BaseToken.address],
      0,
      DEFI_FEE_BPS,
      ProtocolManager.address,
    ])) as PancakeswapWorker;

    await WorkerTOK0_TOK1.deployed();

    swapHelper = new SwapHelper(
      PancakeFactory.address,
      PancakeRouterV2.address,
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
        token0: CakeToken,
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

    lpBUSD_TOK0__account1 = PancakePair__factory.connect(lpBUSD_TOK0, account1);
    lpBUSD_TOK0__account2 = PancakePair__factory.connect(lpBUSD_TOK0, account2);
    PancakeMasterChef__account1 = PancakeMasterChef__factory.connect(
      PancakeMasterChef.address,
      account1
    );
    PancakeMasterChef__account2 = PancakeMasterChef__factory.connect(
      PancakeMasterChef.address,
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
      const worker__deployer = PancakeswapWorker__factory.connect(
        WorkerBUSD_TOK0.address,
        deployer
      );

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
        parseEther("0.099872512608433641").toString()
      );

      const latestBlock = await time.latestBlockNumber();

      await time.advanceBlockTo(latestBlock.add(1).toNumber()); /// + 1 BLOCK

      // Harvest rewards and send them to the operating vault in Base token
      await worker__deployer.harvestRewards(); /// + 1 BLOCK

      expect(await MockVault.rewards(1)).to.be.eq(parseEther("9.756649592554072839").toString());

      /*
      There are two positions in pancakeMasterChef with the same alloc points, so 0.5 CAKE per block is generated for the given position.
      2 BLOCK = 2 * 0.5 CAKE = 1 CAKE
      1 CAKE ~ 10 BASE TOKEN (without trading fee)
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
      const worker__deployer = PancakeswapWorker__factory.connect(
        WorkerTOK0_TOK1.address,
        deployer
      );

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
        parseEther("0.099491623915500588").toString()
      );

      const latestBlock = await time.latestBlockNumber();

      await time.advanceBlockTo(latestBlock.add(1).toNumber()); /// + 1 BLOCK

      // Harvest rewards and send them to the operating vault in Base token
      await worker__deployer.harvestRewards(); /// + 1 BLOCK

      /*
      There are two positions in pancakeMasterChef with the same alloc points, so 0.5 CAKE per block is generated for the given position.
      2 BLOCK = 2 * 0.5 CAKE = 1 CAKE
      1 CAKE ~ 10 BASE TOKEN (without trading fee)
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
    await lpBUSD_TOK0__account1.approve(PancakeMasterChef.address, parseEther("0.1"));
    await lpBUSD_TOK0__account2.approve(PancakeMasterChef.address, parseEther("0.1"));
    await PancakeMasterChef__account1.deposit(1, parseEther("0.1"));
    await PancakeMasterChef__account2.deposit(1, parseEther("0.1")); // account 1 + 1 / 2 CAKE

    await PancakeMasterChef__account1.withdraw(1, parseEther("0.1")); // account 1 + 1 / 4 CAKE

    expect((await CakeToken.balanceOf(account1Address)).toString()).to.be.eq(
      CAKE_PER_BLOCK.mul(3).div(4).toString()
    );
  });

  it("should successfully set a treasury config", async () => {
    const worker__admin = WorkerTOK0_TOK1.connect(admin);

    await worker__admin.setTreasuryFee("500");
    expect(await WorkerTOK0_TOK1.treasuryFeeBps()).to.eq("500");
  });

  it("should return proper reward token", async () => {
    const rewardToken = await WorkerBUSD_TOK0.getRewardToken();

    expect(rewardToken).to.be.eql(CakeToken.address);
  });
});
