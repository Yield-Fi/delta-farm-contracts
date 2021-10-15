import { parseEther } from "@ethersproject/units";
import { ethers } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import {
  MockToken__factory,
  MockWBNB__factory,
  PancakeFactory__factory,
  PancakeMasterChef__factory,
  PancakeRouterV2__factory,
} from "../../typechain";
import { getConfig } from "../utils/config";
import { logger } from "../utils/logger";

const func: DeployFunction = async function () {
  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  const pairs = [
    {
      token0: config.tokens.BUSD,
      token1: config.tokens.USDT,
      liquidity: {
        token0: parseEther("10000"),
        token1: parseEther("10000"),
      },
      allocPoints: 1000,
    },
    {
      token0: config.tokens.BUSD,
      token1: config.tokens.DAI,
      liquidity: {
        token0: parseEther("10000"),
        token1: parseEther("10000"),
      },
      allocPoints: 1000,
    },
    {
      token0: config.tokens.USDT,
      token1: config.tokens.DAI,
      liquidity: {
        token0: parseEther("10000"),
        token1: parseEther("10000"),
      },
      allocPoints: 1000,
    },
    {
      token0: config.tokens.WBNB,
      token1: config.tokens.BUSD,
      liquidity: {
        token0: parseEther("1.5"),
        token1: parseEther("10000"),
      },
      allocPoints: 1000,
    },
    {
      token0: config.tokens.WBNB,
      token1: config.tokens.USDT,
      liquidity: {
        token0: parseEther("1.5"),
        token1: parseEther("10000"),
      },
      allocPoints: 1000,
    },
    {
      token0: config.tokens.WBNB,
      token1: config.tokens.CAKE,
      liquidity: {
        token0: parseEther("1.5"),
        token1: parseEther("10000"),
      },
      allocPoints: 1000,
    },
    {
      token0: config.tokens.CAKE,
      token1: config.tokens.BUSD,
      liquidity: {
        token0: parseEther("10000"),
        token1: parseEther("10000"),
      },
      allocPoints: 1000,
    },
    {
      token0: config.tokens.CAKE,
      token1: config.tokens.USDC,
      liquidity: {
        token0: parseEther("10000"),
        token1: parseEther("10000"),
      },
      allocPoints: 1000,
    },
    {
      token0: config.tokens.CAKE,
      token1: config.tokens.USDT,
      liquidity: {
        token0: parseEther("10000"),
        token1: parseEther("10000"),
      },
      allocPoints: 1000,
    },
  ];

  const WBNB = MockWBNB__factory.connect(config.tokens.WBNB, deployer);

  const PancakeFactory = PancakeFactory__factory.connect(
    config.dex.pancakeswap.FactoryV2,
    deployer
  );

  const PancakeRouter = PancakeRouterV2__factory.connect(config.dex.pancakeswap.RouterV2, deployer);

  const PancakeMasterChef = PancakeMasterChef__factory.connect(
    config.dex.pancakeswap.MasterChef,
    deployer
  );

  logger("--> Creating new pairs on Pancakeswap...");
  for (const pair of pairs) {
    const poolLength = (await PancakeMasterChef.poolLength()).toNumber();
    const Token0 = MockToken__factory.connect(pair.token0, deployer);
    const Token1 = MockToken__factory.connect(pair.token1, deployer);

    logger(` - ${await Token0.symbol()}-${await Token1.symbol()} pair:`);

    await PancakeFactory.createPair(pair.token0, pair.token1);

    if (Token0.address.toLowerCase() == config.tokens.WBNB.toLowerCase()) {
      await WBNB.deposit({ value: pair.liquidity.token0 });
    }

    if (Token1.address.toLowerCase() == config.tokens.WBNB.toLowerCase()) {
      await WBNB.deposit({ value: pair.liquidity.token1 });
    }

    await Token0.approve(config.dex.pancakeswap.RouterV2, pair.liquidity.token0);
    await Token1.approve(config.dex.pancakeswap.RouterV2, pair.liquidity.token1);

    const addLiquidityTx = await PancakeRouter.addLiquidity(
      Token0.address,
      Token1.address,
      pair.liquidity.token0,
      pair.liquidity.token1,
      "0",
      "0",
      deployer.address,
      20000000000
    );

    logger(` - Liquidity added: tx hash - ${addLiquidityTx.hash}`);

    const LP_TOKEN = await PancakeFactory.getPair(Token0.address, Token1.address);

    const addFarmTx = await PancakeMasterChef.add(pair.allocPoints, LP_TOKEN, true);

    logger(
      ` - Farm added: pool id - ${poolLength}, lp token: ${LP_TOKEN}, tx hash - ${addFarmTx.hash}`
    );
  }
};

export default func;
func.tags = ["PancakeAddFarms"];
