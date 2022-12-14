import { ethers } from "ethers";
import { ProjectConfigType } from "./types";

const tokens = {
  WBNB: "0xDfb1211E2694193df5765d54350e1145FD2404A1",
  BUSD: "0x97b025F226F4ec2262860A1f9ff93F82c1b029D2",
  USDT: "0x39cA0ab244A8A12Ef7A049e2E5D89837E87Ff3c9",
  WETH: "0x6Bf54886522711841b6BdCA7Be0a08E989359B58",
  USDC: "0x9ceb0082439b53B6cE625b1CdA71Eb99e3ACD610",
  ADA: "0x67d1E743fbc890F2F506E8743A40DBec237d5669",
  DAI: "0xb2a5909C45f58693a43F1d062fbe79481DFDB124",
  BTC: "0x81Fb813F1A900154e442665ce7e5AE9c820AE76a",
  CAKE: "0x619a8Ed7BeD8A131549D0742B7a08EA41d3343F2",
  SYRUP: "0x59EB4E2041759F1381CfE43Ac7Fd70eff56835A3",
  BTCB: "0x0",
  BBT: "",
  ETERNAL: "",
  SANTOS: "",
  UST: "",
};

export const testnetDevConfig: ProjectConfigType = {
  wrappedNativeTokenRelayer: "0x74F07D83fCdbFb9e294Ab6E3082cd2a8ec251Ed7",
  feeCollector: "0x74758233702Cf2f28DCa58E380AD8144363F3EE4",
  protocolManager: "0x2710C784f565dAeaa3B1f9C7719066177F82535b",
  protocolOperators: ["0x07661882d1C4b7F703Ca0A8898afE4D402dFdeF2"],
  adminContract: "0xA1648C2d8883060bf2D83Ca037650409487d8bD3",
  baseToken: tokens.BUSD,
  feeThreshold: 500,
  defaultTreasuryFeeBps: 1000,
  tokens,
  dex: {
    pancakeswap: {
      FactoryV2: "0xAC3749a4A2Cd8BF04D14C98eE08f74B9f5a7Cf5c",
      RouterV2: "0x0e9c1DfbA7A440504A0e4ED311fad2154dDd3A70",
      MasterChef: "0x3Fb6e0aaF321dca70B66ED22815DBD713fc63BBb",
      MasterChefV2: "0xD6F4E36Bc605149E9D90A0b5bb8c135ae8681460",
      LpTokens: [
        {
          pId: 0,
          pIdV2: 100000000000,
          name: "CAKE-WBNB LP (Legacy)",
          address: "0x688B1909314700c6D759Db7D046a1483FF68800c",
        },
        {
          pId: 1,
          pIdV2: 0,
          name: "BUSD-USDT LP",
          address: "0x2f17a541Ba6fCe9d98b67061815e58cdC945f803",
        },
        {
          pId: 2,
          pIdV2: 1,
          name: "BUSD-DAI LP",
          address: "0x1B1eFd3f17fdB551eCA85cCC564c887f4F8Da843",
        },
        {
          pId: 3,
          pIdV2: 2,
          name: "USDT-DAI LP",
          address: "0x932520F6628ccE27dc61ca0668F9E342A1ecB0f8",
        },
        {
          pId: 4,
          pIdV2: 3,
          name: "WBNB-BUSD LP",
          address: "0x33Ce97DcE79688124233378857d47ac22CE1FF2D",
        },
        {
          pId: 5,
          pIdV2: 4,
          name: "WBNB-USDT LP",
          address: "0x33E4b9D28FE9D08Fd462783307aBCCd2084f7914",
        },
        {
          pId: 6,
          pIdV2: 5,
          name: "WBNB-Cake LP",
          address: "0x4866bB7A9811143F1F1CD1a7CAf0648776da88A4",
        },
      ],
    },
  },
  strategies: {
    pancakeswap: {
      AddToPoolWithBaseToken: "0x7D0933E71d857AAC259acCC973286CD99ba05afD",
      AddToPoolWithoutBaseToken: "0x811a4e20C57c7C4Fc979ea440C4DB9030b7458C4",
      Liquidate: "0xBE01dAaa0236A3f747F9CA9040F5dDB62E3de46D",
    },
  },
  vaults: [
    {
      name: "BUSD Vault",
      address: "0x47b40e076Ebd3826ba1D1CA92079AEf2E87303A4",
      baseToken: tokens.BUSD,
      config: "0x15b8F0fF52306bae2e3fCD367EE875196AB7F8F3",
      workers: {
        pancake: [
          {
            name: "BUSD-USDT PancakeswapWorker",
            address: "0x23d1795831F1a618990213c4f539941D743162a2",
            poolId: "1",
            token0: tokens.BUSD,
            token1: tokens.USDT,
            defaultHarvestThreshold: "1",
          },
          {
            name: "BUSD-DAI PancakeswapWorker",
            address: "0x06b714Aa5a827a22CB5a66AC978C7962a2C9B6a0",
            poolId: "2",
            token0: tokens.BUSD,
            token1: tokens.DAI,
            defaultHarvestThreshold: "1",
          },
          {
            name: "USDT-DAI PancakeswapWorker",
            address: "0x28DF5D376Ad33a64Ed72CDF46ce14c8014e37a74",
            poolId: "3",
            token0: tokens.USDT,
            token1: tokens.DAI,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-BUSD PancakeswapWorker",
            address: "0x56810eBa003389bBA354E306D0e05b81227Bf582",
            poolId: "4",
            token0: tokens.WBNB,
            token1: tokens.BUSD,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-USDT PancakeswapWorker",
            address: "0xFDF1C9c222e394cB043f2f12a1bfA50f3733CDE0",
            poolId: "5",
            token0: tokens.WBNB,
            token1: tokens.USDT,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-CAKE PancakeswapWorker",
            address: "0xd323871FDC8f2F23653b6A2Dc497FAd8a6c9Ab05",
            poolId: "6",
            token0: tokens.WBNB,
            token1: tokens.CAKE,
            defaultHarvestThreshold: "1",
          },
        ],
        pancakeV2: [
          {
            name: "BUSD-USDT Pancakeswap V2",
            address: "0x5a1ef2d90D743c0AfE36BD171bEf6028Ef957341",
            poolId: "0",
            token0: tokens.BUSD,
            token1: tokens.USDT,
            defaultHarvestThreshold: "1",
          },
          {
            name: "BUSD-DAI Pancakeswap V2",
            address: "0x18C9f5D77116acaaa423AB83B84d1A9821050Ef8",
            poolId: "1",
            token0: tokens.BUSD,
            token1: tokens.DAI,
            defaultHarvestThreshold: "1",
          },
          {
            name: "USDT-DAI Pancakeswap V2",
            address: "0xBBC4E25aAc6B595447A7176DB0dEc95f25684FD4",
            poolId: "2",
            token0: tokens.USDT,
            token1: tokens.DAI,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-BUSD Pancakeswap V2",
            address: "0x3b1859e1Bbb3ee2e87dCde4f519F1f83974149C6",
            poolId: "3",
            token0: tokens.WBNB,
            token1: tokens.BUSD,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-USDT Pancakeswap V2",
            address: "0xb5B39Ff4458d8aDEFA493CfB98eEE3190af8dA19",
            poolId: "4",
            token0: tokens.WBNB,
            token1: tokens.USDT,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-CAKE Pancakeswap V2",
            address: "0x7D6F2D4bCD0a7DB3B690714124a30caCDE19791e",
            poolId: "5",
            token0: tokens.WBNB,
            token1: tokens.CAKE,
            defaultHarvestThreshold: "1",
          },
        ],
      },
    },
  ],
  clients: [
    {
      address: "0xed54D3537E974259ad2cC82a4F925ab7d5fAf410",
      kind: "CEX",
      name: "Client A",
      operators: [
        "0x07661882d1C4b7F703Ca0A8898afE4D402dFdeF2",
        "0x3Fec471402390B7b6ee32CAc8F88FDD6A5859A72",
        "0x972989E6e1dFF6f6C03B3F2b0392f73081d53f8F",
      ],
      callers: [ethers.constants.AddressZero],
      additionalWithdrawers: [ethers.constants.AddressZero],
    },
  ],
};
