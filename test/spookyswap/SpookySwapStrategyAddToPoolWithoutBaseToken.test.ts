import "@openzeppelin/test-helpers";

import {
  MockToken,
  MockToken__factory,
  MockWBNB,
  ProtocolManager,
  SpookySwapStrategyAddToPoolWithoutBaseToken,
  SpookySwapStrategyAddToPoolWithoutBaseToken__factory,
  UniswapV2Factory,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  UniswapV2Router02,
} from "../../typechain";
import { ethers, waffle } from "hardhat";

import { Signer, BigNumber } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { parseEther } from "@ethersproject/units";
import { deployContract, deployProxyContract, deployTokens } from "../helpers";
import { SwapHelper } from "../helpers/swap";
import { defaultAbiCoder } from "@ethersproject/abi";
import { assertAlmostEqual } from "../helpers/assert";
import { deploySpookySwap } from "../helpers/deploySpookySwap";

chai.use(solidity);
const { expect } = chai;

describe("SpookySwapStrategyAddToPoolWithoutBaseToken", () => {
  const booPerSecond = parseEther("1");
  let protocolManager: ProtocolManager;

  let deployer: Signer;
  let deployerAddress: string;
  let account1: Signer;
  let account1Address: string;

  let BaseToken: MockToken;
  let Token0: MockToken;
  let Token1: MockToken;
  let lpTOK0_TOK1: UniswapV2Pair;

  let UniswapV2Factory: UniswapV2Factory;
  let UniswapV2Router02: UniswapV2Router02;

  let swapHelper: SwapHelper;

  let strategy: SpookySwapStrategyAddToPoolWithoutBaseToken;

  async function fixture() {
    [deployer, account1] = await ethers.getSigners();
    [deployerAddress, account1Address] = await Promise.all([
      deployer.getAddress(),
      account1.getAddress(),
    ]);

    protocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[await deployer.getAddress()]],
      deployer
    )) as ProtocolManager;

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
              amount: parseEther("23000000"),
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
              address: deployerAddress,
              amount: parseEther("2000000"),
            },
          ],
        },
      ],
      deployer
    );

    const MockWBNB = (await deployContract("MockWBNB", [], deployer)) as MockWBNB;

    [UniswapV2Factory, UniswapV2Router02] = await deploySpookySwap(
      MockWBNB,
      booPerSecond,
      [{ address: deployerAddress, amount: parseEther("200") }],
      deployer
    );

    await protocolManager.setStables([MockWBNB.address]);

    await UniswapV2Factory.createPair(Token0.address, Token1.address);
    const lp = await UniswapV2Factory.getPair(Token0.address, Token1.address);

    lpTOK0_TOK1 = UniswapV2Pair__factory.connect(lp, deployer);

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
        amount1desired: ethers.utils.parseEther("100000"),
      },
      {
        token0: BaseToken,
        token1: Token1,
        amount0desired: ethers.utils.parseEther("100000"),
        amount1desired: ethers.utils.parseEther("100000"),
      },
      {
        token0: Token0,
        token1: Token1,
        amount0desired: ethers.utils.parseEther("100000"),
        amount1desired: ethers.utils.parseEther("10000"),
      },
    ]);

    strategy = (await deployProxyContract(
      "SpookySwapStrategyAddToPoolWithoutBaseToken",
      [UniswapV2Router02.address, protocolManager.address],
      deployer
    )) as SpookySwapStrategyAddToPoolWithoutBaseToken;
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  it("should revert on bad calldata", async () => {
    await expect(strategy.execute("0x1234")).to.be.reverted;
  });

  it("should convert all base token to LP tokens at best rate", async () => {
    const baseToken__account1 = MockToken__factory.connect(BaseToken.address, account1);
    const strategy__account1 = SpookySwapStrategyAddToPoolWithoutBaseToken__factory.connect(
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

    assertAlmostEqual(
      (await lpTOK0_TOK1.balanceOf(account1Address)).toString(),
      parseEther("15.763997536318553037").toString()
    );
    expect((await BaseToken.balanceOf(strategy.address)).toString()).to.be.eq(
      parseEther("0").toString()
    );
  });

  it("should revert when amount of received lp tokens is too low", async () => {
    const baseToken__account1 = MockToken__factory.connect(BaseToken.address, account1);
    const strategy__account1 = SpookySwapStrategyAddToPoolWithoutBaseToken__factory.connect(
      strategy.address,
      account1
    );

    // Transfer 1 BASE TOKEN to the strategy
    await baseToken__account1.transfer(strategy.address, parseEther("1"));

    expect((await BaseToken.balanceOf(strategy.address)).toString()).to.be.eq(
      parseEther("1").toString()
    );

    await expect(
      strategy__account1.execute(
        defaultAbiCoder.encode(
          ["address", "address", "address", "uint256"],
          [BaseToken.address, Token0.address, Token1.address, parseEther("10")]
        )
      )
    ).to.be.revertedWith("Insufficient LP tokens received");
  });

  it("Should estimate amounts of base token after split and converting to token0 and token1", async () => {
    const [firstPartOfBaseToken, secondPartOfBaseToken, amountOfToken0, amountOfToken1] =
      await strategy.callStatic.estimateAmounts(
        BaseToken.address,
        Token0.address,
        Token1.address,
        parseEther("1")
      );

    expect(firstPartOfBaseToken.toString()).to.be.eq(parseEther("0.5").toString());
    expect(secondPartOfBaseToken.toString()).to.be.eq(parseEther("0.5").toString());
    /// 1 BASE TOKEN = 10 TOKEN0
    /// 0.5 BASE TOKEN ~= 5 TOKEN0 - some trading fee
    expect(amountOfToken0.toString()).to.be.eq(parseEther("4.989751011424529915").toString());
    /// 1 BASE TOKEN = 1 TOKEN1
    /// 0.5 BASE TOKEN ~= 0.5 TOKEN0 - some trading fee
    expect(amountOfToken1.toString()).to.be.eq(parseEther("0.498997510002425087").toString());
  });
});
