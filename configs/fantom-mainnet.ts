const tokens = {
  WBNB: "",
  BUSD: "",
  WETH: "",
  USDT: "",
  USDC: "",
  ADA: "",
  DAI: "",
  BTCB: "",
  CAKE: "",
  SYRUP: "",
  BBT: "",
  ETERNAL: "",
  SANTOS: "",
  UST: "",
};

export const mainnetConfig = {
  wrappedNativeTokenRelayer: "",
  feeCollector: "",
  protocolManager: "",
  protocolOperators: ["" /* YieldFi EOA */],
  adminContract: "",
  feeThreshold: 500,
  defaultTreasuryFeeBps: 1000,
  baseToken: tokens.BUSD,
  tokens,
  dex: {
    spookyswap: {
      FactoryV2: "",
      RouterV2: "",
      MasterChef: "",
      LpTokens: [
        {
          pId: 1,
          pIdV2: 0,
          name: "CAKE-WBNB LP (Legacy)",
          address: "0xa527a61703d82139f8a06bc30097cc9caa2df5a6",
        },
      ],
    },
  },
  strategies: {
    spookyswap: {
      AddToPoolWithBaseToken: "",
      AddToPoolWithoutBaseToken: "",
      Liquidate: "",
    },
  },
  vaults: [
    {
      name: "BUSD Vault",
      address: "",
      baseToken: tokens.BUSD,
      config: "",
      workers: {},
    },
  ],
  clients: [
    {
      address: "",
      kind: "CEFI",
      name: "Client A",
      operators: [""],
      callers: [""],
      additionalWithdrawers: [""],
    },
  ],
};
