import { BigNumber, Signer } from "ethers";
import {
  CakeToken,
  MockToken,
  PancakeFactory,
  PancakeMasterChef,
  PancakeMasterChef__factory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  PancakeswapStrategyAddBaseTokenOnly,
  PancakeswapStrategyLiquidate,
  PancakeswapWorker,
  SyrupBar,
} from "../typechain";
import { ethers, upgrades, waffle } from "hardhat";

import chai from "chai";
import { solidity } from "ethereum-waffle";
import { deployContract, deployPancakeStrategies, deployPancakeV2, deployTokens } from "./helpers";
import { parseEther } from "@ethersproject/units";
import { SwapHelper } from "./helpers/swap";
import { MockWBNB } from "../typechain";
import { parse } from "path/posix";

chai.use(solidity);
const { expect } = chai;

describe("PancakeswapWorker", () => {
  const CAKE_PER_BLOCK = parseEther("0.076");
  const REINVEST_FEE_BPS = "100";

  let deployer: Signer;
  let deployerAddress: string;
  let vaultOperator: Signer;
  let vaultOperatorAddress: string;
  let account1: Signer;
  let account1Address: string;
  let account2: Signer;
  let account2Address: string;
  let treasuryAccount: Signer;
  let treasuryAccountAddress: string;

  let WorkerBUSD_TOK0: PancakeswapWorker;
  let WorkerTOK0_TOK1: PancakeswapWorker;
  let PancakeFactory: PancakeFactory;
  let PancakeMasterChef: PancakeMasterChef;
  let PancakeMasterChef__account1: PancakeMasterChef;
  let PancakeMasterChef__account2: PancakeMasterChef;
  let PancakeRouterV2: PancakeRouterV2;
  let CakeToken: CakeToken;
  let SyrupBar: SyrupBar;

  let AddBaseTokenOnlyStrategy: PancakeswapStrategyAddBaseTokenOnly;
  let LiquidateStrategy: PancakeswapStrategyLiquidate;

  let BaseToken: MockToken;
  let Token0: MockToken;
  let Token1: MockToken;
  let lpBUSD_TOK0__deployer: PancakePair;
  let lpBUSD_TOK0__account1: PancakePair;
  let lpBUSD_TOK0__account2: PancakePair;

  let lpTOK0_TOK1__deployer: PancakePair;
  let lpTOK0_TOK1__account1: PancakePair;
  let lpTOK0_TOK1__account2: PancakePair;

  let swapHelper: SwapHelper;

  async function fixture() {
    [deployer, account1, account2, vaultOperator, treasuryAccount] = await ethers.getSigners();
    [
      deployerAddress,
      account1Address,
      account2Address,
      vaultOperatorAddress,
      treasuryAccountAddress,
    ] = await Promise.all([
      deployer.getAddress(),
      account1.getAddress(),
      account2.getAddress(),
      vaultOperator.getAddress(),
      treasuryAccount.getAddress(),
    ]);

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
              amount: parseEther("100"),
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
              amount: parseEther("100"),
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
              amount: parseEther("100"),
            },
          ],
        },
      ],
      deployer
    );

    const MockWBNB = (await deployContract("MockWBNB", [], deployer)) as MockWBNB;

    [PancakeFactory, PancakeRouterV2, CakeToken, SyrupBar, PancakeMasterChef] =
      await deployPancakeV2(
        MockWBNB,
        CAKE_PER_BLOCK,
        [{ address: deployerAddress, amount: parseEther("100") }],
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

    [AddBaseTokenOnlyStrategy, LiquidateStrategy] = await deployPancakeStrategies(
      PancakeRouterV2,
      deployer
    );

    const PancakeswapWorkerFactory = await ethers.getContractFactory("PancakeswapWorker", deployer);

    WorkerBUSD_TOK0 = (await upgrades.deployProxy(PancakeswapWorkerFactory, [
      vaultOperatorAddress,
      BaseToken.address,
      PancakeMasterChef.address,
      PancakeRouterV2.address,
      1,
      AddBaseTokenOnlyStrategy.address,
      LiquidateStrategy.address,
      REINVEST_FEE_BPS,
      treasuryAccountAddress,
      [CakeToken.address, MockWBNB.address, BaseToken.address],
      0,
    ])) as PancakeswapWorker;

    await WorkerBUSD_TOK0.deployed();

    WorkerTOK0_TOK1 = (await upgrades.deployProxy(PancakeswapWorkerFactory, [
      vaultOperatorAddress,
      BaseToken.address,
      PancakeMasterChef.address,
      PancakeRouterV2.address,
      2,
      AddBaseTokenOnlyStrategy.address,
      LiquidateStrategy.address,
      REINVEST_FEE_BPS,
      treasuryAccountAddress,
      [CakeToken.address, MockWBNB.address, BaseToken.address],
      0,
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
        amount0desired: ethers.utils.parseEther("1"),
        amount1desired: ethers.utils.parseEther("0.1"),
      },
      {
        token0: CakeToken,
        token1: MockWBNB,
        amount0desired: ethers.utils.parseEther("0.1"),
        amount1desired: ethers.utils.parseEther("1"),
      },
      {
        token0: BaseToken,
        token1: MockWBNB,
        amount0desired: ethers.utils.parseEther("1"),
        amount1desired: ethers.utils.parseEther("1"),
      },
      {
        token0: Token0,
        token1: MockWBNB,
        amount0desired: ethers.utils.parseEther("1"),
        amount1desired: ethers.utils.parseEther("1"),
      },
    ]);

    lpBUSD_TOK0__account1 = PancakePair__factory.connect(lpBUSD_TOK0, account1);
    lpBUSD_TOK0__account2 = PancakePair__factory.connect(lpBUSD_TOK0, account2);
    lpTOK0_TOK1__account1 = PancakePair__factory.connect(lpTOK0_TOK1, account1);
    lpTOK0_TOK1__account2 = PancakePair__factory.connect(lpTOK0_TOK1, account2);
    PancakeMasterChef__account1 = PancakeMasterChef__factory.connect(
      PancakeMasterChef.address,
      account1
    );
    PancakeMasterChef__account2 = PancakeMasterChef__factory.connect(
      PancakeMasterChef.address,
      account2
    );
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

  it("should successfully set a treasury account", async () => {
    await WorkerTOK0_TOK1.setTreasuryConfig(account2Address, REINVEST_FEE_BPS);
    expect(await WorkerTOK0_TOK1.treasuryAccount()).to.eq(account2Address);
  });

  it("should approve reinvest and liquidate strategies", async () => {
    expect(await WorkerTOK0_TOK1.approvedStrategies(AddBaseTokenOnlyStrategy.address)).to.be.eq(
      true
    );
    expect(await WorkerTOK0_TOK1.approvedStrategies(LiquidateStrategy.address)).to.be.eq(true);
  });

  it("should add supported strategy", async () => {
    await WorkerTOK0_TOK1.setApprovedStrategies([account2Address], true);
    expect(await WorkerTOK0_TOK1.approvedStrategies(account2Address)).to.be.eq(true);
  });
});
