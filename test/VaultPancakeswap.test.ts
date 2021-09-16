import "@openzeppelin/test-helpers";

import { BigNumber, Signer, constants } from "ethers";
import {
  CakeToken,
  MockContractContext__factory,
  MockWBNB,
  PancakeFactory,
  PancakeMasterChef,
  PancakeMasterChef__factory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  SyrupBar,
  Vault,
  Vault__factory,
  WNativeRelayer,
} from "../typechain";
import { config, ethers, upgrades, waffle } from "hardhat";
import { deployToken, deployTokens, deployWBNB } from "./helpers/deployToken";

// import * as AssertHelpers from "./helpers/assert";
// import * as TimeHelpers from "./helpers/time";
import { MockContractContext } from "../typechain/MockContractContext";
import { MockToken } from "../typechain/MockToken";
import { PancakeswapStrategyAddBaseTokenOnly } from "../typechain/PancakeswapStrategyAddBaseTokenOnly";
import { PancakeswapStrategyLiquidate } from "../typechain/PancakeswapStrategyLiquidate";
import { SwapHelper } from "./helpers/swap";
import { Worker02Helper } from "./helpers/worker";
import chai from "chai";
import { deployPancakeStrategies } from "./helpers/deployStrategies";
import { deployPancakeV2 } from "./helpers";
import { deployVault } from "./helpers/deployVault";
import { parseEther } from "ethers/lib/utils";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;

const CAKE_REWARD_PER_BLOCK = ethers.utils.parseEther("0.076");

let baseToken: MockToken;
let targetToken: MockToken;

let lp: PancakePair;
let cake: CakeToken;
let syrup: SyrupBar;

let mockWBNB: MockWBNB;

let deployer: Signer;
let alice: Signer;
let bob: Signer;
let eve: Signer;

let vault: Vault;
let wNativeRelayer: WNativeRelayer;

let addStrat: PancakeswapStrategyAddBaseTokenOnly;
let liqStrat: PancakeswapStrategyLiquidate;

let deployerAddress: string;
let aliceAddress: string;
let bobAddress: string;
let eveAddress: string;

let whitelistedContract: MockContractContext;
let evilContract: MockContractContext;

let factory: PancakeFactory;
let router: PancakeRouterV2;
let masterChef: PancakeMasterChef;

async function fixture() {
  [deployer, alice, bob, eve] = await ethers.getSigners();
  [deployerAddress, aliceAddress, bobAddress, eveAddress] = await Promise.all([
    deployer.getAddress(),
    alice.getAddress(),
    bob.getAddress(),
    eve.getAddress(),
  ]);

  // Setup MockContractContext
  const MockContractContext = (await ethers.getContractFactory(
    "MockContractContext",
    deployer
  )) as MockContractContext__factory;
  whitelistedContract = await MockContractContext.deploy();
  await whitelistedContract.deployed();
  evilContract = await MockContractContext.deploy();
  await evilContract.deployed();

  baseToken = await deployToken(
    {
      name: "BASETOKEN",
      symbol: "BTOKEN",
      holders: [
        { address: deployerAddress, amount: ethers.utils.parseEther("1000") },
        { address: aliceAddress, amount: ethers.utils.parseEther("1000") },
        { address: bobAddress, amount: ethers.utils.parseEther("1000") },
      ],
    },
    deployer
  );

  targetToken = await deployToken(
    {
      name: "TARGETTOKEN",
      symbol: "TTOKEN",
      holders: [
        { address: deployerAddress, amount: ethers.utils.parseEther("1000") },
        { address: aliceAddress, amount: ethers.utils.parseEther("1000") },
        { address: bobAddress, amount: ethers.utils.parseEther("1000") },
      ],
    },
    deployer
  );

  mockWBNB = await deployWBNB(deployer);

  [factory, router, cake, syrup, masterChef] = await deployPancakeV2(
    mockWBNB,
    CAKE_REWARD_PER_BLOCK,
    [{ address: deployerAddress, amount: ethers.utils.parseEther("100") }],
    deployer
  );

  // Treasury acc = address zero (?)
  [vault, wNativeRelayer] = await deployVault(
    mockWBNB,
    ethers.constants.AddressZero,
    baseToken,
    deployer
  );

  // Setup strategies
  [addStrat, liqStrat] = await deployPancakeStrategies(router, deployer);

  // Setup BTOKEN-FTOKEN pair on Pancakeswap
  // Add lp to masterChef's pool
  await factory.createPair(baseToken.address, targetToken.address);
  lp = PancakePair__factory.connect(
    await factory.getPair(targetToken.address, baseToken.address),
    deployer
  );
  await masterChef.add(1, lp.address, true);
}

beforeEach(async () => {
  await waffle.loadFixture(fixture);
});

it("should work", async () => {
  //
});
