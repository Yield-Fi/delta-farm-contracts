"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const units_1 = require("@ethersproject/units");
const hardhat_1 = require("hardhat");
const typechain_1 = require("../../typechain");
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
const func = async function () {
    const [deployer] = await hardhat_1.ethers.getSigners();
    const config = (0, config_1.getConfig)();
    const pairs = [
        // {
        //   token0: config.tokens.BUSD,
        //   token1: config.tokens.USDT,
        //   liquidity: {
        //     token0: parseEther("10000"),
        //     token1: parseEther("10000"),
        //   },
        //   allocPoints: 1000,
        // },
        // {
        //   token0: config.tokens.BUSD,
        //   token1: config.tokens.DAI,
        //   liquidity: {
        //     token0: parseEther("10000"),
        //     token1: parseEther("10000"),
        //   },
        //   allocPoints: 1000,
        // },
        // {
        //   token0: config.tokens.USDT,
        //   token1: config.tokens.DAI,
        //   liquidity: {
        //     token0: parseEther("10000"),
        //     token1: parseEther("10000"),
        //   },
        //   allocPoints: 1000,
        // },
        // {
        //   token0: config.tokens.WBNB,
        //   token1: config.tokens.BUSD,
        //   liquidity: {
        //     token0: parseEther("1.5"),
        //     token1: parseEther("10000"),
        //   },
        //   allocPoints: 1000,
        // },
        // {
        //   token0: config.tokens.WBNB,
        //   token1: config.tokens.USDT,
        //   liquidity: {
        //     token0: parseEther("1.5"),
        //     token1: parseEther("10000"),
        //   },
        //   allocPoints: 1000,
        // },
        // {
        //   token0: config.tokens.WBNB,
        //   token1: config.tokens.CAKE,
        //   liquidity: {
        //     token0: parseEther("1.5"),
        //     token1: parseEther("10000"),
        //   },
        //   allocPoints: 1000,
        // },
        {
            token0: config.tokens.CAKE,
            token1: config.tokens.BUSD,
            liquidity: {
                token0: (0, units_1.parseEther)("10000"),
                token1: (0, units_1.parseEther)("10000"),
            },
            allocPoints: 1000,
        },
        {
            token0: config.tokens.CAKE,
            token1: config.tokens.USDC,
            liquidity: {
                token0: (0, units_1.parseEther)("10000"),
                token1: (0, units_1.parseEther)("10000"),
            },
            allocPoints: 1000,
        },
        {
            token0: config.tokens.CAKE,
            token1: config.tokens.USDT,
            liquidity: {
                token0: (0, units_1.parseEther)("10000"),
                token1: (0, units_1.parseEther)("10000"),
            },
            allocPoints: 1000,
        },
    ];
    const WBNB = typechain_1.MockWBNB__factory.connect(config.tokens.WBNB, deployer);
    const PancakeFactory = typechain_1.PancakeFactory__factory.connect(config.dex.pancakeswap.FactoryV2, deployer);
    const PancakeRouter = typechain_1.PancakeRouterV2__factory.connect(config.dex.pancakeswap.RouterV2, deployer);
    const PancakeMasterChef = typechain_1.PancakeMasterChef__factory.connect(config.dex.pancakeswap.MasterChef, deployer);
    (0, logger_1.logger)("--> Creating new pairs on Pancakeswap...");
    for (const pair of pairs) {
        const poolLength = (await PancakeMasterChef.poolLength()).toNumber();
        const Token0 = typechain_1.MockToken__factory.connect(pair.token0, deployer);
        const Token1 = typechain_1.MockToken__factory.connect(pair.token1, deployer);
        (0, logger_1.logger)(` - ${await Token0.symbol()}-${await Token1.symbol()} pair:`);
        await PancakeFactory.createPair(pair.token0, pair.token1, { gasLimit: "210000" });
        if (Token0.address.toLowerCase() == config.tokens.WBNB.toLowerCase()) {
            await WBNB.deposit({ value: pair.liquidity.token0 });
        }
        if (Token1.address.toLowerCase() == config.tokens.WBNB.toLowerCase()) {
            await WBNB.deposit({ value: pair.liquidity.token1 });
        }
        await Token0.approve(config.dex.pancakeswap.RouterV2, pair.liquidity.token0);
        await Token1.approve(config.dex.pancakeswap.RouterV2, pair.liquidity.token1);
        const addLiquidityTx = await PancakeRouter.addLiquidity(Token0.address, Token1.address, pair.liquidity.token0, pair.liquidity.token1, "0", "0", deployer.address, 20000000000);
        (0, logger_1.logger)(` - Liquidity added: tx hash - ${addLiquidityTx.hash}`);
        const LP_TOKEN = await PancakeFactory.getPair(Token0.address, Token1.address);
        const addFarmTx = await PancakeMasterChef.add(pair.allocPoints, LP_TOKEN, true, {
            gasLimit: "210000",
        });
        (0, logger_1.logger)(` - Farm added: pool id - ${poolLength}, lp token: ${LP_TOKEN}, tx hash - ${addFarmTx.hash}`);
    }
};
exports.default = func;
func.tags = ["PancakeAddFarms"];
