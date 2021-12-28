import { ethers } from "ethers";
import { ProjectConfigType } from "./types";

const tokens = {
  WBNB: "0xDfb1211E2694193df5765d54350e1145FD2404A1",
  BUSD: "0x23d92E3Bbb84b6728124F568f16a036f6D104765",
  USDT: "0x7c2A2E9D3a18eFdA47D49A6c282F408dA1A3c6cC",
  WETH: "0x6Bb2c5cE8Fe6E7DAC1eaC265be0715d03Fd8f28E",
  USDC: "0x4727de0f00C7fa69F38B78bC465B59DBe8fD7E3f",
  ADA: "0xd49635f1D770d715B058df45067aB7bc0B55C43b",
  DAI: "0x86401c8f5a243036bd47F2B111b6F587074f591C",
  BTC: "0xe956CaBc1dD0ac3bff4063ff2fa417753db1D23C",
  CAKE: "0x8dD60cc834a9E16363234F38cc08d42b655DE9A5",
  SYRUP: "0x7f2B092784ac5E1AdfB0aF14812c6B81AE7D8a6c",
  BTCB: "0x0",
};

export const testnetConfig: ProjectConfigType = {
  wrappedNativeTokenRelayer: "0xEcB919458700157D5a4D15D472D38727b09644DD",
  feeCollector: "0x6Ea1d3fC73dd2207F97c74715373A7A4f432dfe5",
  protocolManager: "0x8f5Ccf63976338CcD02f0eB3C6A5753c5468ABC0",
  protocolOperators: ["0x32d9A383F53B1317BBa7F99AeC19a7E97D44b76e"],
  adminContract: "0x3FbD9e47Fc85C6b489639E9D0414e1Aac1841FaC",
  baseToken: tokens.BUSD,
  feeThreshold: 500,
  defaultTreasuryFeeBps: 1000,
  tokens,
  dex: {
    pancakeswap: {
      FactoryV2: "0x0C896b39F6f51613c16d317f58806df998cf8319",
      RouterV2: "0x0c0c300ccd543A11B9AFE4dE3268F68bA81bB6f8",
      MasterChef: "0xFe5D8a0E5a280B9bA06B4cbb02404478dE73581b",
      LpTokens: [
        {
          pId: 0,
          name: "CAKE-WBNB LP (Legacy)",
          address: "0x688B1909314700c6D759Db7D046a1483FF68800c",
        },
        {
          pId: 1,
          name: "BUSD-USDT LP",
          address: "0xb8DA25cFB4E913eA665426232abDc32676346847",
        },
        {
          pId: 2,
          name: "BUSD-DAI LP",
          address: "0xd7F35c7B2E9840C63d120EcaE0c501b57c4dCcA4",
        },
        {
          pId: 3,
          name: "USDT-DAI LP",
          address: "0xdae2342f5DB3d5a460d092C26886bd882c8fBec8",
        },
        {
          pId: 4,
          name: "WBNB-BUSD LP",
          address: "0x90b04A7f9681b3759bc0342F8EC6FaD765F98a2c",
        },
        {
          pId: 5,
          name: "WBNB-USDT LP",
          address: "0x113f70dDE380C7e16cceaEfca24Cb11C5f98F358",
        },
        {
          pId: 6,
          name: "WBNB-Cake LP",
          address: "0x13270e75B15384aeb8d92BB27ca5ECfAF1870558",
        },
        {
          pId: 7,
          name: "Cake-BUSD LP",
          address: "0xFb3761BD647C594502F8e8194c044F39A600A061",
        },
        {
          pId: 8,
          name: "Cake-USDC LP",
          address: "0x891Cc7BE028F310d0Bb1D316eb87ffC51a377E32",
        },
        {
          pId: 9,
          name: "Cake-USDT LP",
          address: "0x7E60cB2a97CF7f2294fdfF5329055b88a212D211",
        },
      ],
    },
  },
  strategies: {
    pancakeswap: {
      AddToPoolWithBaseToken: "0x24676a9A5952f6B3381CA264E0FeCe4308E3A935",
      AddToPoolWithoutBaseToken: "0x39728b3700Ec9C79ffB7C462e39BB6c3a683B94F",
      Liquidate: "0x0cDD4Bb2756266d3b097Ba87dbB2d90cC3141c3F",
    },
  },
  vaults: [
    {
      name: "BUSD Vault",
      address: "0x2F9322016f683E328b9501072957Bc42D1cC2bb9",
      baseToken: tokens.BUSD,
      config: "0xcC4d7158760c85D48AfF142D78b06919a4852BE5",
      workers: [
        {
          name: "BUSD-USDT PancakeswapWorker",
          address: "0x5AB100ABE5806640eECDe0e44f3BaCCBbB252998",
          positionId: "1",
          token0: tokens.BUSD,
          token1: tokens.USDT,
          defaultHarvestThresshold: "1",
        },
        {
          name: "BUSD-DAI PancakeswapWorker",
          address: "0x3b349d1326b3777A578342c87d8b60f75078BAdc",
          positionId: "2",
          token0: tokens.BUSD,
          token1: tokens.DAI,
          defaultHarvestThresshold: "1",
        },
        // {
        //   name: "USDT-DAI PancakeswapWorker",
        //   address: "",
        //   positionId: "3",
        //   token0: tokens.USDT,
        //   token1: tokens.DAI,
        //   defaultHarvestThresshold: "1",
        // },
        // {
        //   name: "WBNB-BUSD PancakeswapWorker",
        //   address: "",
        //   positionId: "4",
        //   token0: tokens.WBNB,
        //   token1: tokens.BUSD,
        //   defaultHarvestThresshold: "1",
        // },
        // {
        //   name: "WBNB-USDT PancakeswapWorker",
        //   address: "",
        //   positionId: "5",
        //   token0: tokens.WBNB,
        //   token1: tokens.USDT,
        //   defaultHarvestThresshold: "1",
        // },
        // {
        //   name: "WBNB-CAKE PancakeswapWorker",
        //   address: "",
        //   positionId: "6",
        //   token0: tokens.WBNB,
        //   token1: tokens.CAKE,
        //   defaultHarvestThresshold: "1",
        // },
        // {
        //   name: "BUSD-CAKE PancakeswapWorker",
        //   address: "",
        //   positionId: "7",
        //   token0: tokens.BUSD,
        //   token1: tokens.CAKE,
        //   defaultHarvestThresshold: "1",
        // },
        // {
        //   name: "CAKE-USDC PancakeswapWorker",
        //   address: "",
        //   positionId: "8",
        //   token0: tokens.USDC,
        //   token1: tokens.CAKE,
        //   defaultHarvestThresshold: "1",
        // },
        // {
        //   name: "CAKE-USDT PancakeswapWorker",
        //   address: "",
        //   positionId: "9",
        //   token0: tokens.USDT,
        //   token1: tokens.CAKE,
        //   defaultHarvestThresshold: "1",
        // },
      ],
    },
  ],
  clients: [
    {
      address: "0xaA6F53894d5a935e2611514997c388BEbc879189",
      kind: "CEX",
      name: "Client A",
      operators: ["0x6bAA0A1A70eB7975774b801Bc342EC826aA82FC6"],
      callers: [ethers.constants.AddressZero],
      additionalWithdrawers: [ethers.constants.AddressZero],
    },
  ],
};
