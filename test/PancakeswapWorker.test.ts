import { BigNumber, Signer, constants } from "ethers";
import {
  CakeToken,
  MockToken,
  PancakeFactory,
  PancakeMasterChef,
  PancakeMasterChef__factory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  PancakeswapWorker,
  SyrupBar,
} from "../typechain";
import { ethers, upgrades, waffle } from "hardhat";

import chai from "chai";
import { solidity } from "ethereum-waffle";
import {
  deployContract,
  deployPancakeswapStrategies,
  deployPancakeV2,
  deployTokens,
} from "./helpers";
import { parseEther } from "@ethersproject/units";
import { MockWBNB } from "../typechain/MockWBNB";
import { SwapHelper } from "./helpers/swap";

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

  let PancakeswapWorker: PancakeswapWorker;
  let PancakeFactory: PancakeFactory;
  let PancakeMasterChef: PancakeMasterChef;
  let PancakeMasterChef__account1: PancakeMasterChef;
  let PancakeMasterChef__account2: PancakeMasterChef;
  let PancakeRouterV2: PancakeRouterV2;
  let CakeToken: CakeToken;
  let SyrupBar: SyrupBar;

  let BaseToken: MockToken;
  let Token0: MockToken;
  let Token1: MockToken;
  let lp__deployer: PancakePair;
  let lp__account1: PancakePair;
  let lp__account2: PancakePair;

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
    const lp = await PancakeFactory.getPair(BaseToken.address, Token0.address);
    lp__deployer = PancakePair__factory.connect(lp, deployer);
    await PancakeMasterChef.add(1, lp__deployer.address, true);

    const [AddBaseTokenOnlyStrategy, LiquidateStrategy] = await deployPancakeswapStrategies(
      PancakeRouterV2,
      deployer
    );

    const PancakeswapWorkerFactory = await ethers.getContractFactory("PancakeswapWorker", deployer);

    PancakeswapWorker = (await upgrades.deployProxy(PancakeswapWorkerFactory, [
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

    lp__account1 = PancakePair__factory.connect(lp, account1);
    PancakeMasterChef__account1 = PancakeMasterChef__factory.connect(
      PancakeMasterChef.address,
      account1
    );
    lp__account2 = PancakePair__factory.connect(lp, account2);
    PancakeMasterChef__account2 = PancakeMasterChef__factory.connect(
      PancakeMasterChef.address,
      account2
    );
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  context("when base token is contain in pool", async () => {
    it("should has a correct token0 and token1 addresses", async () => {
      const result = [
        (await PancakeswapWorker.token0()).toLowerCase(),
        (await PancakeswapWorker.token1()).toLowerCase(),
      ];
      expect(result).to.include(BaseToken.address.toLowerCase());
      expect(result).to.include(Token0.address.toLowerCase());
    });

    it("should give rewards out when you stake LP tokens", async () => {
      // Distribute lp tokens to the accounts
      await lp__deployer.transfer(account1Address, parseEther("0.1"));

      // Staking 0.1 Lp tokens

      console.log(await lp__account1.balanceOf(account1Address));
      await lp__account1.approve(PancakeMasterChef.address, parseEther("0.1"));
      await PancakeMasterChef__account1.deposit(1, parseEther("0.1"));
      await lp__account2.approve(PancakeMasterChef.address, parseEther("0.1"));
      await PancakeMasterChef__account2.deposit(1, parseEther("0.1"));

      expect((await CakeToken.balanceOf(account1Address)).toString()).to.be.eq(
        CAKE_PER_BLOCK.toString()
      );
    });
  });
});
