import { ProjectConfigType } from "./types";

const tokens = {
  WBNB: "0xDfb1211E2694193df5765d54350e1145FD2404A1",
  ALPACA: "0x354b3a11D5Ea2DA89405173977E271F58bE2897D",
  sALPACA: "0xd4B9F8001BC9E756350D53E8d786121dC0dB455b",
  BUSD: "0x0266693F9Df932aD7dA8a9b44C2129Ce8a87E81f",
  CAKE: "0x7aBcA3B5f0Ca1da0eC05631d5788907D030D0a22",
  SYRUP: "0x6F55c83f6FA7a23C1d342fE84fC49C05533AcFcE",
  USDT: "0xE60Fa777dEb72C364447BB18C823C4731FbeD671",
  BTCB: "0xCCaf3FC49B0D0F53fe2c08103F75A397052983FB",
  ETH: "0xd5c082df9eDE041548fa79e05A1CB077036ca86F",
  DOT: "0xD33AE1cab48Ec14EE081E8C1c2872586f7b35A52",
  UNI: "0x952337d30fE8648f096Bc755DB3e599409C62570",
  LINK: "0x3B7b786477089055b689C85fe8248851507F7Ff8",
  XVS: "0x74b446ab45a68eCF4C9723B45734b796f6dA7ae4",
  YFI: "0xFBFf897F471afdf22b5d8c32f88A529a87a7B81b",
  VAI: "0xD189Be96c38BeC6fa9FbCB0e148cA1564D51b959",
  USDC: "0x74E6d184A8cD7d43E9b2B46b66F6Eb92d36a768B",
  DAI: "0xa5dd524379382a6a756920509109E078c7ba026C",
  UST: "0xd413E8Cb2855533a5724745B7060c8b18e2bDcfD",
  BETH: "0x32Dde246479D538c0FC45a667e002cE33Fc57a15",
  COMP: "0xd02A71609f9eB0e3270A1417D79e2c12903D3aa1",
  SUSHI: "0x86c1f21D1622516576ba514b53d2fE5Dbe48Bab0",
  ITAM: "0xd817BfBE43229134e7127778a96C0180e47c10B4",
  bMXX: "0xeA84558A0638e6D84B7D2c3d5953827501DF97f8",
  BELT: "0xc1721223cBFc97F90Af0c6122f7c25919c0f6803",
  BOR: "0x88cF83734637a8c38296429b21E70C7C4785F7EC",
  BRY: "0x90Cd1D56754E8Ca0e103bCeB6DA1e4F4E5D92186",
  pCWS: "0x70203967b050cFa986C6A1de42C3AF08e00De026",
  SWINGBY: "0x588C1F4B4C772dD019691456f143D4e34771F3cE",
  DODO: "0x80e7Ec7bDFD410AFd073109FC28fB7451e83931B",
  WEX: "0x1da1dFaAEF18F4587e505C5dE0f9ED1a219e4146",
  BORING: "0x9576BE6fD507e730fbE6b4A9e1352626efDFcA0d",
  WAULTx: "0xA70EbF609d5f834cE9798Af6D72A63Dcd6D71075",
  ODDZ: "0x4d51E18ACbb2C95eb52a85a3683112345dA01656",
  TUSD: "0xf2de08AC7d8b8C8630cA5143A49a789698327Da9",
  ADA: "0xb6Fd69f8C4afA4f8b820683932CdbaA3609D1E1F",
  FORM: "0xbcCcc3CA4C7ced85E319e23caD252A2b2E37DBD3",
  MATIC: "0x43bA788e45A479880613155950CD2f45c5C4e16b",
  TRX: "0x1C240979179F929D3F72171275cB7Ec8c55B0d3f",
  BTT: "0x415baCAb125Be426d916bF0D67d952FCD1Cc922b",
  ORBS: "0x6f01395Ae92776D98F509BBECE53160051F6a872",
  AXS: "0x8Aa44e8bef88ba4dfB7520bc973E4F08AC109373",
  PMON: "0x19a70AA2b35f4FB1C24E59d7F679bf120b44B7cD",
  PHA: "0x6A8a9CAF4916846b8568d39B8dbc44C355EcA6ec",
  WUSD: "0xEC2aF9Ca74Ba42f5a25b0aff5Ed0761ee922a5df",
};

export const testnetConfig: ProjectConfigType = {
  wrappedNativeTokenRelayer: "0x988052AFA52E4cEcbF50923Cdbc1EE7207663ccc",
  bountyCollector: "0x47C2A9B88A3f22EA701478578F05980F4d91eb92",
  protocolManager: "0xad3FF8BAB14ADF7AddBbab533bdB7Ef27dA5BF36",
  treasuryAccount: "0x94FC2d635D65e6f657b7617843915a41c87B7852",
  baseToken: tokens.BUSD,
  bountyThreshold: 500,
  defaultTreasuryFeeBps: 1000,
  tokens,
  dex: {
    pancakeswap: {
      FactoryV2: "0xda8EE87e2172d997a7fe05a83FC5c472B40FacCE",
      RouterV2: "0x367633909278A3C91f4cB130D8e56382F00D1071",
      MasterChef: "0xbCC50b0B0AFD19Ee83a6E79e6c01D51b16090A0B",
      LpTokens: [
        {
          pId: 1,
          name: "CAKE-WBNB LP (Legacy)",
          address: "0x0e0867202aBA2899e0E668455B745f6Bd037B029",
        },
        {
          pId: 2,
          name: "BTCB-WBNB LP (Legacy)",
          address: "0x8859ac598B0c0Cc1d9995aB74bbDF64c4c47F45d",
        },
        {
          pId: 3,
          name: "ETH-WBNB LP (Legacy)",
          address: "0xD66C91E730949eDE01885FEEd359E13a4A6142Ab",
        },
        {
          pId: 5,
          name: "USDT-BUSD LP (Legacy)",
          address: "0x28bE867621241533136003852Ae69f0844490104",
        },
        {
          pId: 4,
          name: "WBNB-BUSD LP (Legacy)",
          address: "0x5f87B8f3705069380010dEd9f8575f4147eF1dB1",
        },
        {
          pId: 7,
          name: "DOT-WBNB LP (Legacy)",
          address: "0xa10C1E6B15d0f15867C6Ab0Dd0ccF8883D6A359d",
        },
        {
          pId: 8,
          name: "UNI-WBNB LP (Legacy)",
          address: "0xaD12f7d74D15b7cAdeA01B04eBe1C505abfBe4fc",
        },
        {
          pId: 9,
          name: "LINK-WBNB LP (Legacy)",
          address: "0x47Ad481dE016436E22a426319A88d0097079F6eE",
        },
        {
          pId: 10,
          name: "XVS-WBNB LP (Legacy)",
          address: "0xd2Adf0F11967E7aDB183C329Ea2b2f45af8bC0d1",
        },
        {
          pId: 11,
          name: "YFI-WBNB LP (Legacy)",
          address: "0x9C5780AaFC56B0090EFB04663e86D9bEFfCF23cB",
        },
        {
          pId: 12,
          name: "VAI-BUSD LP (Legacy)",
          address: "0xA61bb010D76eeDae6Bff366cf0cDFD5261069ac1",
        },
        {
          pId: 13,
          name: "USDC-BUSD LP (Legacy)",
          address: "0x0F917dA4AbB16641B2c631913F0a4853D9f274F8",
        },
        {
          pId: 14,
          name: "DAI-BUSD LP (Legacy)",
          address: "0x144Cb4Aff90640B934301FD658cF0587De522eAC",
        },
        {
          pId: 15,
          name: "UST-BUSD LP (Legacy)",
          address: "0x3aa448865beDde0fEb63F2C30D3487A4EC293DA6",
        },
        {
          pId: 16,
          name: "BETH-ETH LP",
          address: "0x8F98153c0F907617d86FA3e93d9766826B126a5A",
        },
        {
          pId: 17,
          name: "COMP-ETH LP (Legacy)",
          address: "0xaD96bBF52EB8f522481F3f5BD2FC777cDD92bC40",
        },
        {
          pId: 18,
          name: "SUSHI-ETH LP (Legacy)",
          address: "0xa905bcf59fdc725DE9Dc1A5F89dE40d906cf7942",
        },
        {
          pId: 19,
          name: "ITAM-WBNB LP (Legacy)",
          address: "0xC3ff9A64867f71986642C8e12EE2925A726A2535",
        },
        {
          pId: 20,
          name: "ALPACA-BUSD LP (Legacy)",
          address: "0x3cE9D43050EBc68abE73769a603De0113371875b",
        },
        {
          pId: 21,
          name: "CAKE-WBNB LP",
          address: "0x9cC2bed47Aa2346f7d01F53d888724c87c810EC2",
        },
        {
          pId: 22,
          name: "BTCB-WBNB LP",
          address: "0xdF85a773771875F96493FDdB341A197d860Bc90d",
        },
        {
          pId: 23,
          name: "ETH-WBNB LP",
          address: "0xC4aaAac2C7b0e76dc53eaaD0495df30030A0A1c4",
        },
        {
          pId: 24,
          name: "USDT-BUSD LP",
          address: "0x7bd6AB478b47fd096E37CCA290eB4409544a50F2",
        },
        {
          pId: 25,
          name: "DOT-WBNB LP",
          address: "0xCB217DC5fAd9eA8f71c0c1E60c0Be97AE65e3654",
        },
        {
          pId: 26,
          name: "UNI-WBNB LP",
          address: "0x652F66573Fed901a459363046dC6aC6474E71305",
        },
        {
          pId: 27,
          name: "LINK-WBNB LP",
          address: "0xE8761502Ace4a88e34b04eD26229cd01159a4e7B",
        },
        {
          pId: 28,
          name: "XVS-WBNB LP",
          address: "0x3fad087a019634b7d21f7E49668a5EA155FF20e4",
        },
        {
          pId: 29,
          name: "YFI-WBNB LP",
          address: "0x7Dec2528edCd14f8577D69a6badc10646130bE4C",
        },
        {
          pId: 30,
          name: "VAI-BUSD LP",
          address: "0x1109e443Bf37194f6B31B9A8E2ec52A88169606a",
        },
        {
          pId: 31,
          name: "USDC-BUSD LP",
          address: "0x142cc7fe062ff0e1cF40a73b5E7CB583817278Cb",
        },
        {
          pId: 32,
          name: "DAI-BUSD LP",
          address: "0x0B77762F65016BDFaEa82BcABa00Dce320B8697C",
        },
        {
          pId: 33,
          name: "UST-BUSD LP",
          address: "0x55A1425980bf718380B902fE293705e82594E4EF",
        },
        {
          pId: 35,
          name: "COMP-ETH LP",
          address: "0x185F20C5AF3dA949e41D287984c1A4f5652A48b1",
        },
        {
          pId: 36,
          name: "SUSHI-ETH LP",
          address: "0x7245467FC12d9a6904966aaf2c2ffC8f57b97667",
        },
        {
          pId: 37,
          name: "ITAM-WBNB LP",
          address: "0x2E02F4512599C9a6a1a5A1602e3c8DbDA129cCfD",
        },
        {
          pId: 38,
          name: "WBNB-BUSD LP",
          address: "0x8918A1B7d90B2d33eA89784a8405896430Dd0Ba9",
        },
        {
          pId: 39,
          name: "ALPACA-BUSD LP",
          address: "0xF76cD665848A21C4C634B6956719813c617646C9",
        },
        {
          pId: 40,
          name: "BTCB-BUSD LP",
          address: "0x958BD4cF570D4de0E59db9926Ce138f6FE96464D",
        },
        {
          pId: 41,
          name: "bMXX-WBNB LP",
          address: "0xc4A3DE5e10AE6E7312C9A4646F23B4B07E1c09b8",
        },
        {
          pId: 42,
          name: "BELT-WBNB LP",
          address: "0xA22A71d3993D3DC1Be74554046610bb3EA4B9E87",
        },
        {
          pId: 43,
          name: "BOR-WBNB LP",
          address: "0x376B2a364298d116384903B544C2515729661011",
        },
        {
          pId: 44,
          name: "BRY-WBNB LP",
          address: "0x89edDA1208ab8368C1d6Be6B5956e6EB2ABe5ebB",
        },
        {
          pId: 45,
          name: "pCWS-WBNB LP",
          address: "0x4EBF2181d75c7246712274eF674fA219D458a42C",
        },
        {
          pId: 46,
          name: "SWINGBY-WBNB LP",
          address: "0x8760aFEeF41C544324261bd974b113512f5E5243",
        },
        {
          pId: 47,
          name: "DODO-WBNB LP",
          address: "0x92D7AB192c9EddD6aeD9B95F39F4f1b7D1cfb044",
        },
        {
          pId: 48,
          name: "USDT-WBNB LP",
          address: "0xe220CD41e219e0e350C40cCb231af8F5C3E109fd",
        },
        {
          pId: 49,
          name: "CAKE-BUSD LP",
          address: "0xf77bE38a641dE1a70b3ECC51655c8e4776fE3F6a",
        },
        {
          pId: 0,
          name: "CAKE",
          address: "0x7aBcA3B5f0Ca1da0eC05631d5788907D030D0a22",
        },
        {
          pId: 50,
          name: "BORING-WBNB LP",
          address: "0x98135F51bd36Db97222024F26B588728Ad96BEa3",
        },
        {
          pId: 51,
          name: "ODDZ-WBNB LP",
          address: "0x4B2EB15AE0d772C1846249db78c3Cbe9FbB1F4fB",
        },
        {
          pId: 52,
          name: "TUSD-BUSD LP",
          address: "0x557f6a13D6C09bA8918f63C51Dd90eD0Ae5685A7",
        },
        {
          pId: 54,
          name: "ADA-WBNB LP",
          address: "0xc6Ddd130C132458a2d71098eE619fdc5d78E2371",
        },
        {
          pId: 56,
          name: "FORM-BUSD LP",
          address: "0xBf4301EF97585016ecB2D955b5190510654E9e96",
        },
        {
          pId: 57,
          name: "CAKE-USDT LP",
          address: "0x68213338E9A2c1010AaB78E79a78f5c27659397F",
        },
        {
          pId: 58,
          name: "USDC-USDT LP",
          address: "0x8E2fFdBf7713b7c68418CFA7ee65430C544C44d7",
        },
        {
          pId: 59,
          name: "TRX-WBNB LP",
          address: "0xd913790f6D4a670A204AD538BaB95611f7387e58",
        },
        {
          pId: 60,
          name: "BTT-WBNB LP",
          address: "0x2D7B149Ee7659254fd39d6F33e7b713544403257",
        },
        {
          pId: 61,
          name: "ORBS-BUSD LP",
          address: "0x367D7858baC57B32DeEC5B0C9C81bB2794DE1dB8",
        },
        {
          pId: 62,
          name: "AXS-WBNB LP",
          address: "0xa51969919bccF97EE5d98563091Ad94E365489Cf",
        },
        {
          pId: 63,
          name: "TRX-BUSD LP",
          address: "0x8Eaa1Ab40fF74A93976e4B86Fa9602fE37532b19",
        },
        {
          pId: 64,
          name: "BTT-BUSD LP",
          address: "0x9984332666105b8a9578C4Fb8C22944CC3280cE7",
        },
        {
          pId: 65,
          name: "PMON-BUSD LP",
          address: "0xECdD9c374D037418cC6840ffC8C2DB25D6b8Cf62",
        },
        {
          pId: 66,
          name: "PHA-BUSD LP",
          address: "0x36Ea0dbDF7bc4Ced9813700D3d0c280e0c3f1e79",
        },
      ],
    },
  },
  strategies: {
    pancakeswap: {
      AddToPoolWithBaseToken: "0xb38bC11A4D22E914658e6Ea2F72369739f7A79A1",
      AddToPoolWithoutBaseToken: "0x08B0FBB3ce6C63bA048B54876C258310825e709C",
      Liquidate: "0xc7104E49861209899D8f49C75fCB75B362c3Fc4A",
    },
  },
  vaults: [
    {
      name: "BUSD Vault",
      address: "0xaefb2f96619a411Ce49a75E4537F7bF6A7c23520",
      tokenName: "deficental BUSD",
      tokenSymbol: "defiBUSD",
      baseToken: tokens.BUSD,
      config: "0xFc15C9b5FcdD460A9db22AD4Ae7b3838e18cc1E3",
      workers: [
        {
          name: "BUSD-USDT PancakeswapWorker",
          address: "0x88406f07500c6fA5f6C0eacEf519618868E8D24a",
          positionId: "24",
          token0: tokens.BUSD,
          token1: tokens.USDT,
          defaultHarvestThresshold: "1",
        },
      ],
    },
  ],
};
