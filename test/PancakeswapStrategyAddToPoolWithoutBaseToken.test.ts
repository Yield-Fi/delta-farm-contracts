import "@openzeppelin/test-helpers";

import {
  MockToken,
  MockToken__factory,
  MockWBNB,
  PancakeFactory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  PancakeStrategyAddToPoolWithoutBaseToken,
  PancakeStrategyAddToPoolWithoutBaseToken__factory,
} from "../typechain";
import { ethers, waffle } from "hardhat";

import { Signer, BigNumber } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { parseEther } from "@ethersproject/units";
import { deployContract, deployPancakeV2, deployProxyContract, deployTokens } from "./helpers";
import { SwapHelper } from "./helpers/swap";
import { defaultAbiCoder } from "@ethersproject/abi";

chai.use(solidity);
const { expect } = chai;

describe("PancakeswapStrategyAddToPoolWithoutBaseToken", () => {
  const CAKE_PER_BLOCK = parseEther("1");

  let deployer: Signer;
  let deployerAddress: string;
  let account1: Signer;
  let account1Address: string;

  let BaseToken: MockToken;
  let Token0: MockToken;
  let Token1: MockToken;
  let lpTOK0_TOK1: PancakePair;

  let PancakeFactory: PancakeFactory;
  let PancakeRouterV2: PancakeRouterV2;

  let swapHelper: SwapHelper;

  let strategy: PancakeStrategyAddToPoolWithoutBaseToken;

  async function fixture() {
    [deployer, account1] = await ethers.getSigners();
    [deployerAddress, account1Address] = await Promise.all([
      deployer.getAddress(),
      account1.getAddress(),
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
              address: deployerAddress,
              amount: parseEther("2300"),
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
              address: deployerAddress,
              amount: parseEther("2000"),
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
              address: deployerAddress,
              amount: parseEther("2000"),
            },
          ],
        },
      ],
      deployer
    );

    const MockWBNB = (await deployContract("MockWBNB", [], deployer)) as MockWBNB;

    [PancakeFactory, PancakeRouterV2] = await deployPancakeV2(
      MockWBNB,
      CAKE_PER_BLOCK,
      [{ address: deployerAddress, amount: parseEther("200") }],
      deployer
    );

    await PancakeFactory.createPair(Token0.address, Token1.address);
    const lp = await PancakeFactory.getPair(Token0.address, Token1.address);

    lpTOK0_TOK1 = PancakePair__factory.connect(lp, deployer);

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
        amount0desired: ethers.utils.parseEther("100"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: BaseToken,
        token1: Token1,
        amount0desired: ethers.utils.parseEther("1000"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
      {
        token0: Token0,
        token1: Token1,
        amount0desired: ethers.utils.parseEther("100"),
        amount1desired: ethers.utils.parseEther("1000"),
      },
    ]);

    strategy = (await deployProxyContract(
      "PancakeStrategyAddToPoolWithoutBaseToken",
      [PancakeRouterV2.address],
      deployer
    )) as PancakeStrategyAddToPoolWithoutBaseToken;
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  it("should revert on bad calldata", async () => {
    await expect(strategy.execute("0x1234")).to.be.reverted;
  });

  it("should convert all base token to LP tokens at best rate", async () => {
    const baseToken__account1 = MockToken__factory.connect(BaseToken.address, account1);
    const strategy__account1 = PancakeStrategyAddToPoolWithoutBaseToken__factory.connect(
      strategy.address,
      account1
    );

    // Transfer 10 BASE TOKEN to the strategy
    await baseToken__account1.transfer(strategy.address, parseEther("10"));

    expect((await BaseToken.balanceOf(strategy.address)).toString()).to.be.eq(
      parseEther("10").toString()
    );

    await strategy__account1.execute(
      defaultAbiCoder.encode(
        ["address", "address", "address", "uint256"],
        [BaseToken.address, Token0.address, Token1.address, 0]
      )
    );

    expect((await lpTOK0_TOK1.balanceOf(account1Address)).toString()).to.be.eq(
      parseEther("0.286501283247051729").toString()
    );
    expect((await BaseToken.balanceOf(strategy.address)).toString()).to.be.eq(
      parseEther("0").toString()
    );
  });
});
