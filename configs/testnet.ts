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
  BBT: "",
  ETERNAL: "",
  SANTOS: "",
  UST: "",
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
      MasterChefV2: "0xcCB54b0af0Dbf77f3c31934e01715878D51BE06D",
      LpTokens: [
        {
          pId: 0,
          pIdV2: 0,
          name: "CAKE-WBNB LP (Legacy)",
          address: "0x688B1909314700c6D759Db7D046a1483FF68800c",
        },
        {
          pId: 1,
          pIdV2: 0,
          name: "BUSD-USDT LP",
          address: "0xb8DA25cFB4E913eA665426232abDc32676346847",
        },
        {
          pId: 2,
          pIdV2: 1,
          name: "BUSD-DAI LP",
          address: "0xd7F35c7B2E9840C63d120EcaE0c501b57c4dCcA4",
        },
        {
          pId: 3,
          pIdV2: 2,
          name: "USDT-DAI LP",
          address: "0xdae2342f5DB3d5a460d092C26886bd882c8fBec8",
        },
        {
          pId: 4,
          pIdV2: 3,
          name: "WBNB-BUSD LP",
          address: "0x90b04A7f9681b3759bc0342F8EC6FaD765F98a2c",
        },
        {
          pId: 5,
          pIdV2: 4,
          name: "WBNB-USDT LP",
          address: "0x113f70dDE380C7e16cceaEfca24Cb11C5f98F358",
        },
        {
          pId: 6,
          pIdV2: 5,
          name: "WBNB-Cake LP",
          address: "0x13270e75B15384aeb8d92BB27ca5ECfAF1870558",
        },
        {
          pId: 7,
          pIdV2: 6,
          name: "Cake-BUSD LP",
          address: "0xFb3761BD647C594502F8e8194c044F39A600A061",
        },
        {
          pId: 8,
          pIdV2: 7,
          name: "Cake-USDC LP",
          address: "0x891Cc7BE028F310d0Bb1D316eb87ffC51a377E32",
        },
        {
          pId: 9,
          pIdV2: 8,
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
      workers: {
        pancake: [
          {
            name: "BUSD-USDT PancakeswapWorker",
            address: "0x7084D729A4240F458167cE33e0329EA0d29c9D5a",
            poolId: "1",
            token0: tokens.BUSD,
            token1: tokens.USDT,
            defaultHarvestThreshold: "1",
          },
          {
            name: "BUSD-DAI PancakeswapWorker",
            address: "0xAA4AAd87114948Aa160F0179568d26b454EdcC2C",
            poolId: "2",
            token0: tokens.BUSD,
            token1: tokens.DAI,
            defaultHarvestThreshold: "1",
          },
          {
            name: "USDT-DAI PancakeswapWorker",
            address: "0x55f4dd762D6f7557dd2e31728e748eED8AFcc188",
            poolId: "3",
            token0: tokens.USDT,
            token1: tokens.DAI,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-BUSD PancakeswapWorker",
            address: "0x5Ce349eDB15922D78A3eE315C2d45F49C4DbFfE1",
            poolId: "4",
            token0: tokens.WBNB,
            token1: tokens.BUSD,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-USDT PancakeswapWorker",
            address: "0xcd27Bc932f87C76ff6249d1d96810bfa4608eF18",
            poolId: "5",
            token0: tokens.WBNB,
            token1: tokens.USDT,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-CAKE PancakeswapWorker",
            address: "0x7145865A1F6DfcA9764718B36bf114d3aA6460e3",
            poolId: "6",
            token0: tokens.WBNB,
            token1: tokens.CAKE,
            defaultHarvestThreshold: "1",
          },
          {
            name: "BUSD-CAKE PancakeswapWorker",
            address: "0xc17ff9ff1f0CD69CBe42593A4fA314b56B5809B6",
            poolId: "7",
            token0: tokens.BUSD,
            token1: tokens.CAKE,
            defaultHarvestThreshold: "1",
          },
          {
            name: "CAKE-USDC PancakeswapWorker",
            address: "0xf07a50fB889b968AB85A1EB022B830819E416D24",
            poolId: "8",
            token0: tokens.USDC,
            token1: tokens.CAKE,
            defaultHarvestThreshold: "1",
          },
          {
            name: "CAKE-USDT PancakeswapWorker",
            address: "0xF2B51A4959e95c7fA59D1939640A10B53eeBedFB",
            poolId: "9",
            token0: tokens.USDT,
            token1: tokens.CAKE,
            defaultHarvestThreshold: "1",
          },
        ],
        pancakeV2: [
          {
            name: "BUSD-USDT Pancakeswap V2",
            address: "0x6296Cd62CB31b78482Dc2102117787f3f4d4bD33",
            poolId: "0",
            token0: tokens.BUSD,
            token1: tokens.USDT,
            defaultHarvestThreshold: "1",
          },
          {
            name: "BUSD-DAI Pancakeswap V2",
            address: "0xd0F8ECBe9cAE077659af6207bf8900cBe80831Ac",
            poolId: "1",
            token0: tokens.BUSD,
            token1: tokens.DAI,
            defaultHarvestThreshold: "1",
          },
          {
            name: "USDT-DAI Pancakeswap V2",
            address: "0x544b7D1BBb7177706E87c63272D382445Cd7a61B",
            poolId: "2",
            token0: tokens.USDT,
            token1: tokens.DAI,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-BUSD Pancakeswap V2",
            address: "0xfc36cb9f541F2087aA7C286289aAAFa57Ef3C841",
            poolId: "3",
            token0: tokens.WBNB,
            token1: tokens.BUSD,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-USDT Pancakeswap V2",
            address: "0xedA3146DE9CE1C38C99C1c908bd173f77ec6132A",
            poolId: "4",
            token0: tokens.WBNB,
            token1: tokens.USDT,
            defaultHarvestThreshold: "1",
          },
          {
            name: "WBNB-CAKE Pancakeswap V2",
            address: "0x1b45942d198E84b146B082971535D42753978D6A",
            poolId: "5",
            token0: tokens.WBNB,
            token1: tokens.CAKE,
            defaultHarvestThreshold: "1",
          },
          {
            name: "BUSD-CAKE Pancakeswap V2",
            address: "0x75be00109546ad943DBadd17E89952638C31d209",
            poolId: "6",
            token0: tokens.BUSD,
            token1: tokens.CAKE,
            defaultHarvestThreshold: "1",
          },
          {
            name: "CAKE-USDC Pancakeswap V2",
            address: "0x0530AaEFD93d4F18678d9065720Fb41ADD599072",
            poolId: "7",
            token0: tokens.USDC,
            token1: tokens.CAKE,
            defaultHarvestThreshold: "1",
          },
          {
            name: "CAKE-USDT Pancakeswap V2",
            address: "0xE115146e9aA11a2020bC5705Ab55C16c71F3460D",
            poolId: "8",
            token0: tokens.USDT,
            token1: tokens.CAKE,
            defaultHarvestThreshold: "1",
          },
        ],
      },
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
