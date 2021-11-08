import { ProjectConfigType } from "./types";

const tokens = {
  WBNB: "0xDfb1211E2694193df5765d54350e1145FD2404A1",
  BUSD: "0x23d92E3Bbb84b6728124F568f16a036f6D104765",
  USDT: "0x7c2A2E9D3a18eFdA47D49A6c282F408dA1A3c6cC",
  ETH: "0x6Bb2c5cE8Fe6E7DAC1eaC265be0715d03Fd8f28E",
  USDC: "0x4727de0f00C7fa69F38B78bC465B59DBe8fD7E3f",
  ADA: "0xd49635f1D770d715B058df45067aB7bc0B55C43b",
  DAI: "0x86401c8f5a243036bd47F2B111b6F587074f591C",
  BTC: "0xe956CaBc1dD0ac3bff4063ff2fa417753db1D23C",
  CAKE: "0x8dD60cc834a9E16363234F38cc08d42b655DE9A5",
  SYRUP: "0x7f2B092784ac5E1AdfB0aF14812c6B81AE7D8a6c",
};

export const testnetConfig: ProjectConfigType = {
  wrappedNativeTokenRelayer: "0xB6b260Cb62D87BEBf38871ed780B51203cB35d89",
  feeCollector: "0x795511BEdb51B1d28549896a4b5e5699579F1aEA",
  protocolManager: "0x42991Fad54cA10F0C0A57945991Bfba423F37249",
  protocolOperators: ["0x07661882d1C4b7F703Ca0A8898afE4D402dFdeF2"],
  adminContract: "0x66194F8FFcA81c476554183F953089019936D9F0",
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
      AddToPoolWithBaseToken: "0x66C3c16516be4513B57cf80e8C1503552ae7841a",
      AddToPoolWithoutBaseToken: "0x647d5223adfb794BdEFBCe77237C4d834Bb211EA",
      Liquidate: "0x66C3c16516be4513B57cf80e8C1503552ae7841a",
    },
  },
  vaults: [
    {
      name: "BUSD Vault",
      address: "0xE5d0B7d609c057ad1CE2F27D49Aad80144936CA7",
      baseToken: tokens.BUSD,
      config: "0x62957B015e5389273c269afaf583b960Fb0Ef3FC",
      workers: [
        {
          name: "BUSD-USDT PancakeswapWorker",
          address: "0x7084D729A4240F458167cE33e0329EA0d29c9D5a",
          positionId: "1",
          token0: tokens.BUSD,
          token1: tokens.USDT,
          defaultHarvestThresshold: "1",
        },
        {
          name: "BUSD-DAI PancakeswapWorker",
          address: "0xAA4AAd87114948Aa160F0179568d26b454EdcC2C",
          positionId: "2",
          token0: tokens.BUSD,
          token1: tokens.DAI,
          defaultHarvestThresshold: "1",
        },
        {
          name: "USDT-DAI PancakeswapWorker",
          address: "0x55f4dd762D6f7557dd2e31728e748eED8AFcc188",
          positionId: "3",
          token0: tokens.USDT,
          token1: tokens.DAI,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-BUSD PancakeswapWorker",
          address: "0x5Ce349eDB15922D78A3eE315C2d45F49C4DbFfE1",
          positionId: "4",
          token0: tokens.WBNB,
          token1: tokens.BUSD,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-USDT PancakeswapWorker",
          address: "0xcd27Bc932f87C76ff6249d1d96810bfa4608eF18",
          positionId: "5",
          token0: tokens.WBNB,
          token1: tokens.USDT,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-CAKE PancakeswapWorker",
          address: "0x7145865A1F6DfcA9764718B36bf114d3aA6460e3",
          positionId: "6",
          token0: tokens.WBNB,
          token1: tokens.CAKE,
          defaultHarvestThresshold: "1",
        },
        {
          name: "BUSD-CAKE PancakeswapWorker",
          address: "0xc17ff9ff1f0CD69CBe42593A4fA314b56B5809B6",
          positionId: "7",
          token0: tokens.BUSD,
          token1: tokens.CAKE,
          defaultHarvestThresshold: "1",
        },
        {
          name: "CAKE-USDC PancakeswapWorker",
          address: "0xf07a50fB889b968AB85A1EB022B830819E416D24",
          positionId: "8",
          token0: tokens.USDC,
          token1: tokens.CAKE,
          defaultHarvestThresshold: "1",
        },
        {
          name: "CAKE-USDT PancakeswapWorker",
          address: "0xF2B51A4959e95c7fA59D1939640A10B53eeBedFB",
          positionId: "9",
          token0: tokens.USDT,
          token1: tokens.CAKE,
          defaultHarvestThresshold: "1",
        },
      ],
    },
  ],
  clients: [
    {
      address: "0xf9d9b0b20969639de844ceeA22aF2Ff1735513d5",
      kind: "CEX",
      name: "Client A",
      operators: [
        "0x07661882d1C4b7F703Ca0A8898afE4D402dFdeF2",
        "0x3Fec471402390B7b6ee32CAc8F88FDD6A5859A72",
        "0x972989E6e1dFF6f6C03B3F2b0392f73081d53f8F",
      ],
    },
  ],
};
