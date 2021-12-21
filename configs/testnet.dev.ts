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
      LpTokens: [
        {
          pId: 0,
          name: "CAKE-WBNB LP (Legacy)",
          address: "0x688B1909314700c6D759Db7D046a1483FF68800c",
        },
        {
          pId: 1,
          name: "BUSD-USDT LP",
          address: "0x2f17a541Ba6fCe9d98b67061815e58cdC945f803",
        },
        {
          pId: 2,
          name: "BUSD-DAI LP",
          address: "0x1B1eFd3f17fdB551eCA85cCC564c887f4F8Da843",
        },
        {
          pId: 3,
          name: "USDT-DAI LP",
          address: "0x932520F6628ccE27dc61ca0668F9E342A1ecB0f8",
        },
        {
          pId: 4,
          name: "WBNB-BUSD LP",
          address: "0x33Ce97DcE79688124233378857d47ac22CE1FF2D",
        },
        {
          pId: 5,
          name: "WBNB-USDT LP",
          address: "0x33E4b9D28FE9D08Fd462783307aBCCd2084f7914",
        },
        {
          pId: 6,
          name: "WBNB-Cake LP",
          address: "0x4866bB7A9811143F1F1CD1a7CAf0648776da88A4",
        },
      ],
    },
  },
  strategies: {
    pancakeswap: {
      AddToPoolWithBaseToken: "0x942b4206fB98877Af79fd70a9BABfF15f2930eb6",
      AddToPoolWithoutBaseToken: "0x2642abEcd2E164c8b4C5AC2016c5EF63DFc7163d",
      Liquidate: "0xB17e65D974c84fe85C64712221974654E3148d5f",
    },
  },
  vaults: [
    {
      name: "BUSD Vault",
      address: "0x47b40e076Ebd3826ba1D1CA92079AEf2E87303A4",
      baseToken: tokens.BUSD,
      config: "0x15b8F0fF52306bae2e3fCD367EE875196AB7F8F3",
      workers: [
        {
          name: "BUSD-USDT PancakeswapWorker",
          address: "0x23d1795831F1a618990213c4f539941D743162a2",
          positionId: "1",
          token0: tokens.BUSD,
          token1: tokens.USDT,
          defaultHarvestThresshold: "1",
        },
        {
          name: "BUSD-DAI PancakeswapWorker",
          address: "0x06b714Aa5a827a22CB5a66AC978C7962a2C9B6a0",
          positionId: "2",
          token0: tokens.BUSD,
          token1: tokens.DAI,
          defaultHarvestThresshold: "1",
        },
        {
          name: "USDT-DAI PancakeswapWorker",
          address: "0x28DF5D376Ad33a64Ed72CDF46ce14c8014e37a74",
          positionId: "3",
          token0: tokens.USDT,
          token1: tokens.DAI,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-BUSD PancakeswapWorker",
          address: "0x56810eBa003389bBA354E306D0e05b81227Bf582",
          positionId: "4",
          token0: tokens.WBNB,
          token1: tokens.BUSD,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-USDT PancakeswapWorker",
          address: "0xFDF1C9c222e394cB043f2f12a1bfA50f3733CDE0",
          positionId: "5",
          token0: tokens.WBNB,
          token1: tokens.USDT,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-CAKE PancakeswapWorker",
          address: "0xd323871FDC8f2F23653b6A2Dc497FAd8a6c9Ab05",
          positionId: "6",
          token0: tokens.WBNB,
          token1: tokens.CAKE,
          defaultHarvestThresshold: "1",
        },
      ],
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
