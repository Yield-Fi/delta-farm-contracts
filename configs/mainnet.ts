// https://bscscan.com/tokens
const tokens = {
  WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  BUSD: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
  WETH: "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
  USDT: "0x55d398326f99059fF775485246999027B3197955",
  USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
  ADA: "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47",
  DAI: "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
  BTCB: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
  CAKE: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
  SYRUP: "0x009cf7bc57584b7998236eff51b98a168dcea9b0",
};

export const mainnetConfig = {
  wrappedNativeTokenRelayer: "",
  feeCollector: "",
  protocolManager: "",
  protocolOperators: [
    "0xF066caEFA8CcFC9A5a1F0859d1f5c075aC2F1f06" /* YieldFi EOA */,
    "ADD HERE DEPLOYER ADDRESS!",
  ],
  adminContract: "",
  feeThreshold: 500,
  defaultTreasuryFeeBps: 1000,
  baseToken: tokens.BUSD,
  tokens,
  dex: {
    pancakeswap: {
      FactoryV2: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
      RouterV2: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
      MasterChef: "0x73feaa1eE314F8c655E354234017bE2193C9E24E",
      LpTokens: [
        {
          pId: 1,
          name: "CAKE-WBNB LP (Legacy)",
          address: "0xa527a61703d82139f8a06bc30097cc9caa2df5a6",
        },
        {
          pId: 15,
          name: "BTCB-WBNB LP (Legacy)",
          address: "0x7561eee90e24f3b348e1087a005f78b4c8453524",
        },
        {
          pId: 14,
          name: "ETH-WBNB LP (Legacy)",
          address: "0x70d8929d04b60af4fb9b58713ebcf18765ade422",
        },
        {
          pId: 11,
          name: "USDT-BUSD LP (Legacy)",
          address: "0xc15fa3e22c912a276550f3e5fe3b0deb87b55acd",
        },
        {
          pId: 2,
          name: "WBNB-BUSD LP (Legacy)",
          address: "0x1b96b92314c44b159149f7e0303511fb2fc4774f",
        },
        {
          pId: 5,
          name: "DOT-WBNB LP (Legacy)",
          address: "0xbCD62661A6b1DEd703585d3aF7d7649Ef4dcDB5c",
        },
        {
          pId: 25,
          name: "UNI-WBNB LP (Legacy)",
          address: "0x4269e7F43A63CEA1aD7707Be565a94a9189967E9",
        },
        {
          pId: 7,
          name: "LINK-WBNB LP (Legacy)",
          address: "0xaeBE45E3a03B734c68e5557AE04BFC76917B4686",
        },
        {
          pId: 13,
          name: "XVS-WBNB LP (Legacy)",
          address: "0x41182c32F854dd97bA0e0B1816022e0aCB2fc0bb",
        },
        {
          pId: 24,
          name: "YFI-WBNB LP (Legacy)",
          address: "0x68Ff2ca47D27db5Ac0b5c46587645835dD51D3C1",
        },
        {
          pId: 41,
          name: "VAI-BUSD LP (Legacy)",
          address: "0xfF17ff314925Dff772b71AbdFF2782bC913B3575",
        },
        {
          pId: 53,
          name: "USDC-BUSD LP (Legacy)",
          address: "0x680Dd100E4b394Bda26A59dD5c119A391e747d18",
        },
        {
          pId: 52,
          name: "DAI-BUSD LP (Legacy)",
          address: "0x3aB77e40340AB084c3e23Be8e5A6f7afed9D41DC",
        },
        {
          pId: 63,
          name: "UST-BUSD LP (Legacy)",
          address: "0xD1F12370b2ba1C79838337648F820a87eDF5e1e6",
        },
        {
          pId: 70,
          name: "BETH-ETH LP",
          address: "0x99d865Ed50D2C32c1493896810FA386c1Ce81D91",
        },
        {
          pId: 72,
          name: "COMP-ETH LP (Legacy)",
          address: "0x0392957571F28037607C14832D16f8B653eDd472",
        },
        {
          pId: 78,
          name: "SUSHI-ETH LP (Legacy)",
          address: "0x17580340F3dAEDAE871a8C21D15911742ec79e0F",
        },
        {
          pId: 122,
          name: "ITAM-WBNB LP (Legacy)",
          address: "0xCdC53345192D0e31eEAD03D7E9e008Ee659FAEbE",
        },
        {
          pId: 88888888,
          name: "ALPACA-BUSD LP (Legacy)",
          address: "",
        },
        {
          pId: 251,
          name: "CAKE-WBNB LP",
          address: "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
        },
        {
          pId: 262,
          name: "BTCB-WBNB LP",
          address: "0x61EB789d75A95CAa3fF50ed7E47b96c132fEc082",
        },
        {
          pId: 261,
          name: "ETH-WBNB LP",
          address: "0x74E4716E431f45807DCF19f284c7aA99F18a4fbc",
        },
        {
          pId: 258,
          name: "USDT-BUSD LP",
          address: "0x7EFaEf62fDdCCa950418312c6C91Aef321375A00",
        },
        {
          pId: 252,
          name: "WBNB-BUSD LP",
          address: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16",
        },
        {
          pId: 255,
          name: "DOT-WBNB LP",
          address: "0xDd5bAd8f8b360d76d12FdA230F8BAF42fe0022CF",
        },
        {
          pId: 268,
          name: "UNI-WBNB LP",
          address: "0x014608E87AF97a054C9a49f81E1473076D51d9a3",
        },
        {
          pId: 257,
          name: "LINK-WBNB LP",
          address: "0x824eb9faDFb377394430d2744fa7C42916DE3eCe",
        },
        {
          pId: 260,
          name: "XVS-WBNB LP",
          address: "0x7EB5D86FD78f3852a3e0e064f2842d45a3dB6EA2",
        },
        {
          pId: 267,
          name: "YFI-WBNB LP",
          address: "0xCE383277847f8217392eeA98C5a8B4a7D27811b0",
        },
        {
          pId: 276,
          name: "VAI-BUSD LP",
          address: "0x133ee93FE93320e1182923E1a640912eDE17C90C",
        },
        {
          pId: 283,
          name: "USDC-BUSD LP",
          address: "0x2354ef4DF11afacb85a5C7f98B624072ECcddbB1",
        },
        {
          pId: 282,
          name: "DAI-BUSD LP",
          address: "0x66FDB2eCCfB58cF098eaa419e5EfDe841368e489",
        },
        {
          pId: 293,
          name: "UST-BUSD LP",
          address: "0x05faf555522Fa3F93959F86B41A3808666093210",
        },
        {
          pId: 300,
          name: "COMP-ETH LP",
          address: "0x37908620dEf1491Dd591b5a2d16022A33cDDA415",
        },
        {
          pId: 306,
          name: "SUSHI-ETH LP",
          address: "0x16aFc4F2Ad82986bbE2a4525601F8199AB9c832D",
        },
        {
          pId: 348,
          name: "ITAM-WBNB LP",
          address: "0xd02DA76c813b9cd4516eD50442923E625f90228f",
        },
        {
          pId: 362,
          name: "ALPACA-BUSD LP",
          address: "0x7752e1FA9F3a2e860856458517008558DEb989e3",
        },
        {
          pId: 365,
          name: "BTCB-BUSD LP",
          address: "0xF45cd219aEF8618A92BAa7aD848364a158a24F33",
        },
        {
          pId: 310,
          name: "bMXX-WBNB LP",
          address: "0xc20A92a1424b29b78DFaF92FD35D4cf8A06419B4",
        },
        {
          pId: 318,
          name: "BELT-WBNB LP",
          address: "0xF3Bc6FC080ffCC30d93dF48BFA2aA14b869554bb",
        },
        {
          pId: 308,
          name: "BOR-WBNB LP",
          address: "0xe094c686aD6cDda57b9564457F541FBF099B948A",
        },
        {
          pId: 303,
          name: "BRY-WBNB LP",
          address: "0x21dD71aB78EDE3033c976948f769D506E4F489eE",
        },
        {
          pId: 333,
          name: "pCWS-WBNB LP",
          address: "0x6615CE60D71513aA4849269dD63821D324A23F8C",
        },
        {
          pId: 304,
          name: "SWINGBY-WBNB LP",
          address: "0x4Fd6D315bEf387fAD2322fbc64368fC443F0886D",
        },
        {
          pId: 305,
          name: "DODO-WBNB LP",
          address: "0xA9986Fcbdb23c2E8B11AB40102990a08f8E58f06",
        },
        {
          pId: 264,
          name: "USDT-WBNB LP",
          address: "0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE",
        },
        {
          pId: 389,
          name: "CAKE-BUSD LP",
          address: "0x804678fa97d91B974ec2af3c843270886528a9E6",
        },
        {
          pId: 406,
          name: "BORING-WBNB LP",
          address: "0xDfA808Da5CFB9ABA5Fb3748FF85888F79174F378",
        },
        {
          pId: 343,
          name: "ODDZ-WBNB LP",
          address: "0x3c2c77353E2F6AC1578807b6b2336Bf3a3CbB014",
        },
        {
          pId: 0,
          name: "CAKE",
          address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
        },
        {
          pId: 253,
          name: "ADA-WBNB LP",
          address: "0x28415ff2C35b65B9E5c7de82126b4015ab9d031F",
        },
        {
          pId: 417,
          name: "FORM-BUSD LP",
          address: "0x3E19C18Fe3458A6065D8F0844cB7Eae52C9DAE07",
        },
        {
          pId: 422,
          name: "CAKE-USDT LP",
          address: "0xA39Af17CE4a8eb807E076805Da1e2B8EA7D0755b",
        },
        {
          pId: 423,
          name: "USDC-USDT LP",
          address: "0xec6557348085aa57c72514d67070dc863c0a5a8c",
        },
        {
          pId: 397,
          name: "TUSD-BUSD LP",
          address: "0x2E28b9B74D6d99D4697e913b82B41ef1CAC51c6C",
        },
        {
          pId: 368,
          name: "TRX-WBNB LP",
          address: "0x3cd338c3BB249B6b3C55799F85a589FEbBBFf9Dd",
        },
        {
          pId: 367,
          name: "BTT-WBNB LP",
          address: "0x946696344e7d4346b223e1Cf77035a76690d6A73",
        },
        {
          pId: 416,
          name: "ORBS-BUSD LP",
          address: "0xB87b857670A44356f2b70337E0F218713D2378e8",
        },
        {
          pId: 430,
          name: "AXS-WBNB LP",
          address: "0xC2d00De94795e60FB76Bc37d899170996cBdA436",
        },
        {
          pId: 442,
          name: "TRX-BUSD LP",
          address: "0xb5D108578Be3750209d1b3A8f45FFee8C5a75146",
        },
        {
          pId: 443,
          name: "BTT-BUSD LP",
          address: "0xdcfbB12DED3FEa12D2A078Bc6324131cD14bF835",
        },
        {
          pId: 379,
          name: "PMON-BUSD LP",
          address: "0xcdb0016d97FD0E7EC2C3B78aA4786Cbd8e19C14C",
        },
        {
          pId: 451,
          name: "PHA-BUSD LP",
          address: "0x4ddd56e2f34338839BB5953515833950eA680aFb",
        },
      ],
    },
  },
  strategies: {
    pancakeswap: {
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
      workers: [
        {
          name: "CAKE-WBNB Farm",
          address: "",
          positionId: "251",
          token0: tokens.CAKE,
          token1: tokens.WBNB,
          defaultHarvestThresshold: "1",
        },
        {
          name: "USDT-BUSD Farm",
          address: "",
          positionId: "258",
          token0: tokens.USDT,
          token1: tokens.BUSD,
          defaultHarvestThresshold: "1",
        },
        {
          name: "WBNB-BUSD Farm",
          address: "",
          positionId: "252",
          token0: tokens.WBNB,
          token1: tokens.BUSD,
          defaultHarvestThresshold: "1",
        },
        {
          name: "DAI-BUSD Farm",
          address: "",
          positionId: "282",
          token0: tokens.DAI,
          token1: tokens.BUSD,
          defaultHarvestThresshold: "1",
        },
        {
          name: "USDT-WBNB Farm",
          address: "",
          positionId: "264",
          token0: tokens.USDT,
          token1: tokens.WBNB,
          defaultHarvestThresshold: "1",
        },
        {
          name: "CAKE-BUSD Farm",
          address: "",
          positionId: "389",
          token0: tokens.CAKE,
          token1: tokens.BUSD,
          defaultHarvestThresshold: "1",
        },
        {
          name: "CAKE-USDT Farm",
          address: "",
          positionId: "422",
          token0: tokens.CAKE,
          token1: tokens.USDT,
          defaultHarvestThresshold: "1",
        },
      ],
    },
  ],
  clients: [
    {
      address: "",
      kind: "CEFI",
      name: "Client A",
      operators: [
        "0xD2347FA9A5A41B51676c73D35ee4DAb926765A94",
        "0x80390331BF9b2c4c62CcF4a4d71aD3699a6D2fC2",
        "0xDD4A4AA5E2371b7c2E6D1D80ef69EbFEDF4099dE",
      ],
      callers: [
        "0x28E2b8461365c91Bf8628dfca7aE6Aa158e87F13",
        "0x1F0F7336d624656b71367A1F330094496ccb03ed",
        "0xF24F874f243011Fa505c9b959Ebe3Ca709d8C308",
      ],
      additionalWithdrawers: [
        "0x646962a4cc74e85D05500540710b8966eBc10c76",
        "0xbb6538caBf0eF31e319f546e6dB497A4Ff3666df",
        "0x8db80D02Fe732cDCD1D9c1C2f92B350f80eBDFDE",
        "0x02675ac46A63fd34f52F45c842aD67c3bDe8A2bc",
        "0x7207741fb9743ebB309f83DA81993F68c5b0d08C",
        "0x942C2a648a647fcf0D2f8D43FcaE468dC375eEe0",
        "0xE58f709C84B207938Cb68B625ba8EfcA792eE082",
        "0x6d99D907ff3555Dad00726c94ed3Cf0E7aD1D5bB",
      ],
    },
  ],
};
