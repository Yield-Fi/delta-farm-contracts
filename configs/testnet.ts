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
  CAKE: "0x688B1909314700c6D759Db7D046a1483FF68800c",
  SYRUP: "0x549A44C80561A0779c759F20638478b0CdB80FaA",
};

export const testnetConfig: ProjectConfigType = {
  wrappedNativeTokenRelayer: "0x90F4770c309C5550ee5b7d1ae92a075cb7Ec0271",
  feeCollector: "0xC11B2efC9E4cCe8E176b81658110c31623985a83",
  protocolManager: "0x84378f58c4E5beC1a88374c6306c271795f3D04C",
  treasuryAccount: "0x07661882d1C4b7F703Ca0A8898afE4D402dFdeF2",
  protocolOperators: ["0x07661882d1C4b7F703Ca0A8898afE4D402dFdeF2"],
  adminContract: "0x618c9111BcE2dfA273a22623CD26C3db8C8d953c",
  baseToken: tokens.BUSD,
  feeThreshold: 500,
  defaultTreasuryFeeBps: 1000,
  tokens,
  dex: {
    pancakeswap: {
      FactoryV2: "0xeAa72fA5AD56EC5d6D21210636FfB699F9f3b4e0",
      RouterV2: "0x639972F8315945cC575E3a228c94A2a4B4B319CD",
      MasterChef: "0x8E424AfeB695e6D464DF69179155aB03cc4C7D25",
      LpTokens: [
        {
          pId: 0,
          name: "CAKE-WBNB LP (Legacy)",
          address: "0x688B1909314700c6D759Db7D046a1483FF68800c",
        },
        {
          pId: 1,
          name: "BUSD-USDT LP",
          address: "0xfb5F520959b86A72FE04AA9ADFF0740acc95711d",
        },
        {
          pId: 2,
          name: "BUSD-DAI LP",
          address: "0xBA79d73916A0b2DA4D8E142A8eC5b349Ec1C07AB",
        },
        {
          pId: 3,
          name: "USDT-DAI LP",
          address: "0x8AEfADF6c0C788041e7B28E3Ec0E4fE26BBbD451",
        },
        {
          pId: 4,
          name: "WBNB-BUSD LP",
          address: "0x18842A62973482aF0837f5676547Eea971d88b5a",
        },
      ],
    },
  },
  strategies: {
    pancakeswap: {
      AddToPoolWithBaseToken: "0x65b8584720e15E1a8097204847e1D7F23330aFE9",
      AddToPoolWithoutBaseToken: "0xd780253C818FFB28395b280eb81f862eFA39089F",
      Liquidate: "0x8e564dFa5636553C51a0917a3d2b995e497Fe8dE",
    },
  },
  vaults: [
    {
      name: "BUSD Vault",
      address: "0xDCA36DFaB06a3fB0Ee7197922365E4C581521628",
      tokenName: "deficental BUSD",
      tokenSymbol: "defiBUSD",
      baseToken: tokens.BUSD,
      config: "0x1484cc3a92C6A834ef33210eb0808A58d5D920F3",
      workers: [
        {
          name: "BUSD-USDT PancakeswapWorker",
          address: "0x774157aB8691cE8CE240cbBf987a109475164561",
          positionId: "1",
          token0: tokens.BUSD,
          token1: tokens.USDT,
          defaultHarvestThresshold: "1",
        },
        {
          name: "BUSD-DAI PancakeswapWorker",
          address: "0xd020214A34ef3cAB946F552Ae907aB34A384290e",
          positionId: "2",
          token0: tokens.BUSD,
          token1: tokens.DAI,
          defaultHarvestThresshold: "1",
        },
        {
          name: "USDT-DAI PancakeswapWorker",
          address: "0xD7325b33BDD99B9f8eE5ff0f0d8669B6623Fed33",
          positionId: "3",
          token0: tokens.USDT,
          token1: tokens.DAI,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-BUSD PancakeswapWorker",
          address: "0x3b2fE568b18b5a113d60e3F102f86a466942302a",
          positionId: "4",
          token0: tokens.WBNB,
          token1: tokens.BUSD,
          defaultHarvestThresshold: "1",
        },
      ],
    },
  ],
  clients: [
    {
      address: "0x28A59e7820a018a48b7dDDe69579f4A851BcefAC",
      kind: "kind",
      name: "Client A",
      operators: [
        "0x07661882d1C4b7F703Ca0A8898afE4D402dFdeF2",
        "0x3Fec471402390B7b6ee32CAc8F88FDD6A5859A72",
      ],
    },
  ],
};
