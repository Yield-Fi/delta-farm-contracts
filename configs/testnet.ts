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
  wrappedNativeTokenRelayer: "0xA33d82D24b82C20eA26aD5Dd9Efe2ca5088227Ae",
  feeCollector: "0xB5Ed691eC9A2E490F2266c04EA1A0DF76E1EaC9D",
  protocolManager: "0x90008ABd28FB9fB5BDE7B45C31B8dD4E2d0a05d9",
  treasuryAccount: "0x07661882d1C4b7F703Ca0A8898afE4D402dFdeF2",
  protocolOperators: ["0x07661882d1C4b7F703Ca0A8898afE4D402dFdeF2"],
  adminContract: "0x77729525453adde1B45E689E0C07bD2B89B4Fd93",
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
      AddToPoolWithBaseToken: "0x1992e6d1D71378642162F716C49D6f49F64d8D61",
      AddToPoolWithoutBaseToken: "0xD574608F656a82C093C34165266cd208b2776958",
      Liquidate: "0xB855da6B285631fdE22f0E032EB3C8D111270055",
    },
  },
  vaults: [
    {
      name: "BUSD Vault",
      address: "0xba14d8A1912073647B38dCc6FDF9A1717c9d2011",
      tokenName: "deficental BUSD",
      tokenSymbol: "defiBUSD",
      baseToken: tokens.BUSD,
      config: "0x29Fe39B17Eb4f6cfbefc13CA9CDfCFD97cCF51c2",
      workers: [
        {
          name: "BUSD-USDT PancakeswapWorker",
          address: "0x49BE0A4Cc6599efD8dE8045aDDd1e4Fea5fe306a",
          positionId: "1",
          token0: tokens.BUSD,
          token1: tokens.USDT,
          defaultHarvestThresshold: "1",
        },
        {
          name: "BUSD-DAI PancakeswapWorker",
          address: "0xB57275E202EA4395D6F129B2D285E031241c43bd",
          positionId: "2",
          token0: tokens.BUSD,
          token1: tokens.DAI,
          defaultHarvestThresshold: "1",
        },
        {
          name: "USDT-DAI PancakeswapWorker",
          address: "0x5D7E91c313992e6fC3715A31602D67926330a4a1",
          positionId: "3",
          token0: tokens.USDT,
          token1: tokens.DAI,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-BUSD PancakeswapWorker",
          address: "0xf9aE649B797E25D38FBCdb47811cd3C7bf5872EE",
          positionId: "4",
          token0: tokens.WBNB,
          token1: tokens.BUSD,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-USDT PancakeswapWorker",
          address: "0x4556885dBCBD5397CB4FAB9602685F58da3A06d7",
          positionId: "5",
          token0: tokens.WBNB,
          token1: tokens.USDT,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-CAKE PancakeswapWorker",
          address: "0x5C874ff89F367a6cc3Ef857D42f3e1eCCEA9A77B",
          positionId: "6",
          token0: tokens.WBNB,
          token1: tokens.CAKE,
          defaultHarvestThresshold: "1",
        },
        {
          name: "BUSD-CAKE PancakeswapWorker",
          address: "0xDcEfC7cEf2dD57be912A1406c38f45630e1A9788",
          positionId: "7",
          token0: tokens.BUSD,
          token1: tokens.CAKE,
          defaultHarvestThresshold: "1",
        },
        {
          name: "CAKE-USDC PancakeswapWorker",
          address: "0x7395bD72A43950bEaD0c5458B2C06Db9697c05D3",
          positionId: "8",
          token0: tokens.USDC,
          token1: tokens.CAKE,
          defaultHarvestThresshold: "1",
        },
        {
          name: "CAKE-USDT PancakeswapWorker",
          address: "0xc4aD8CF7a5fcb75DeD1A33408B1b5645435b7290",
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
      address: "0x78137120E255c5B69f8E1F87B7c91e8feA1Eb8Ed",
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
