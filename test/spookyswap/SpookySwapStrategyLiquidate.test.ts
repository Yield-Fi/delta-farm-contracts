import "@openzeppelin/test-helpers";

import {
  MockToken,
  MockToken__factory,
  ProtocolManager,
  SpookySwapStrategyLiquidate,
  SpookySwapStrategyLiquidate__factory,
  UniswapV2Factory,
  UniswapV2Factory__factory,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  UniswapV2Router02,
  UniswapV2Router02__factory,
  WBNB,
  WBNB__factory,
} from "../../typechain";
import { ethers, upgrades, waffle } from "hardhat";

import { Signer } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { parseEther } from "@ethersproject/units";
import { deployProxyContract } from "../helpers";

chai.use(solidity);
const { expect } = chai;

describe("SpookySwapStrategyLiquidate", () => {
  const FOREVER = "2000000000";

  let protocolManager: ProtocolManager;

  /// Pancake-related instance(s)
  let factoryV2: UniswapV2Factory;
  let routerV2: UniswapV2Router02;
  let lp: UniswapV2Pair;

  /// Token-related instance(s)
  let wbnb: WBNB;
  let baseToken: MockToken;
  let farmingToken: MockToken;

  /// Strategy-ralted instance(s)
  let strat: SpookySwapStrategyLiquidate;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;
  let worker: Signer;

  // Contract Signer
  let baseTokenAsAlice: MockToken;
  let baseTokenAsBob: MockToken;

  let lpAsBob: UniswapV2Pair;
  let lpAsAlice: UniswapV2Pair;

  let farmingTokenAsAlice: MockToken;
  let farmingTokenAsBob: MockToken;

  let routerAsAlice: UniswapV2Router02;
  let routerAsBob: UniswapV2Router02;

  let stratAsWorker: SpookySwapStrategyLiquidate;

  async function fixture() {
    [deployer, alice, bob, worker] = await ethers.getSigners();

    protocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[await deployer.getAddress()]],
      deployer
    )) as ProtocolManager;

    // Setup Pancakeswap
    const UniswapV2Factory = (await ethers.getContractFactory(
      "PancakeFactory",
      deployer
    )) as UniswapV2Factory__factory;
    factoryV2 = await UniswapV2Factory.deploy(await deployer.getAddress());
    await factoryV2.deployed();

    const WBNB = (await ethers.getContractFactory("WBNB", deployer)) as WBNB__factory;
    wbnb = await WBNB.deploy();
    await wbnb.deployed();

    await protocolManager.setStables([wbnb.address]);

    const UniswapV2Router02 = (await ethers.getContractFactory(
      "UniswapV2Router02",
      deployer
    )) as UniswapV2Router02__factory;
    routerV2 = await UniswapV2Router02.deploy(factoryV2.address, wbnb.address);
    await routerV2.deployed();

    /// Setup token stuffs
    const MockTokenFactory = (await ethers.getContractFactory(
      "MockToken",
      deployer
    )) as MockToken__factory;
    baseToken = await MockTokenFactory.deploy("BTOKEN", "BTOKEN");
    await baseToken.deployed();
    await baseToken.mint(await alice.getAddress(), ethers.utils.parseEther("100000"));
    await baseToken.mint(await bob.getAddress(), ethers.utils.parseEther("100000"));
    farmingToken = await MockTokenFactory.deploy("FTOKEN", "FTOKEN");
    await farmingToken.deployed();
    await farmingToken.mint(await alice.getAddress(), ethers.utils.parseEther("100000"));
    await farmingToken.mint(await bob.getAddress(), ethers.utils.parseEther("100000"));

    await factoryV2.createPair(baseToken.address, farmingToken.address);

    lp = UniswapV2Pair__factory.connect(
      await factoryV2.getPair(farmingToken.address, baseToken.address),
      deployer
    );

    const SpookySwapStrategyLiquidate = (await ethers.getContractFactory(
      "SpookySwapStrategyLiquidate",
      deployer
    )) as SpookySwapStrategyLiquidate__factory;
    strat = (await upgrades.deployProxy(SpookySwapStrategyLiquidate, [
      routerV2.address,
      protocolManager.address,
    ])) as SpookySwapStrategyLiquidate;
    await strat.deployed();

    // Assign contract signer
    baseTokenAsAlice = MockToken__factory.connect(baseToken.address, alice);
    baseTokenAsBob = MockToken__factory.connect(baseToken.address, bob);

    farmingTokenAsAlice = MockToken__factory.connect(farmingToken.address, alice);
    farmingTokenAsBob = MockToken__factory.connect(farmingToken.address, bob);

    routerAsAlice = UniswapV2Router02__factory.connect(routerV2.address, alice);
    routerAsBob = UniswapV2Router02__factory.connect(routerV2.address, bob);

    lpAsBob = UniswapV2Pair__factory.connect(lp.address, bob);
    lpAsAlice = UniswapV2Pair__factory.connect(lp.address, alice);

    stratAsWorker = strat.connect(worker);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  it("should convert all LP tokens back to baseToken", async () => {
    // Alice adds 100 FTOKEN + 1000 BTOKEN
    await baseTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("1000"));
    await farmingTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("100"));
    await routerAsAlice.addLiquidity(
      baseToken.address,
      farmingToken.address,
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("100"),
      "0",
      "0",
      await alice.getAddress(),
      FOREVER
    );

    // Bob tries to add 1000 FTOKEN + 1000 BTOKEN (but obviously can only add 100 FTOKEN)
    await baseTokenAsBob.approve(routerV2.address, ethers.utils.parseEther("1000"));
    await farmingTokenAsBob.approve(routerV2.address, ethers.utils.parseEther("1000"));
    await routerAsBob.addLiquidity(
      baseToken.address,
      farmingToken.address,
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("1000"),
      "0",
      "0",
      await bob.getAddress(),
      FOREVER
    );

    expect((await baseToken.balanceOf(await bob.getAddress())).toString()).to.eq(
      parseEther("99000").toString()
    );
    expect((await farmingToken.balanceOf(await bob.getAddress())).toString()).to.eq(
      parseEther("99900").toString()
    );
    expect((await lp.balanceOf(await bob.getAddress())).toString()).to.eq(
      parseEther("316.227766016837933199").toString()
    );

    // Bob uses liquidate strategy to withdraw more BTOKEN than he can
    await lpAsBob.transfer(strat.address, ethers.utils.parseEther("316.227766016837933199"));
    await expect(
      strat.execute(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "address", "address", "uint256", "address"],
          [
            baseToken.address,
            baseToken.address,
            farmingToken.address,
            ethers.utils.parseEther("20000"),
            await bob.getAddress(),
          ]
        )
      )
    ).to.be.revertedWith("Insufficient base token amount");

    // Bob uses liquidate strategy to turn all LPs back to BTOKEN
    await strat.execute(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "address", "uint256", "address"],
        [
          baseToken.address,
          baseToken.address,
          farmingToken.address,
          ethers.utils.parseEther("0"),
          await bob.getAddress(),
        ]
      )
    );

    expect((await lp.balanceOf(strat.address)).toString()).to.eq(ethers.utils.parseEther("0"));
    expect((await lp.balanceOf(await bob.getAddress())).toString()).to.eq(
      parseEther("0").toString()
    );
    expect((await baseToken.balanceOf(lp.address)).toString()).to.eq(
      parseEther("500.500500500500500501").toString()
    );
    expect((await farmingToken.balanceOf(lp.address)).toString()).to.eq(
      parseEther("200.000000000000000000").toString()
    );
  });

  it("should convert partial of lp tokens", async () => {
    // Alice adds 100 FTOKEN + 1000 BTOKEN
    await baseTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("1000"));
    await farmingTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("100"));
    await routerAsAlice.addLiquidity(
      baseToken.address,
      farmingToken.address,
      ethers.utils.parseEther("100"),
      ethers.utils.parseEther("10"),
      "0",
      "0",
      await alice.getAddress(),
      FOREVER
    );

    // Bob tries to add 1000 FTOKEN + 1000 BTOKEN (but obviously can only add 100 FTOKEN)
    await baseTokenAsBob.approve(routerV2.address, ethers.utils.parseEther("10000"));
    await farmingTokenAsBob.approve(routerV2.address, ethers.utils.parseEther("10000"));
    await routerAsBob.addLiquidity(
      baseToken.address,
      farmingToken.address,
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("10000"),
      "0",
      "0",
      await bob.getAddress(),
      FOREVER
    );

    // Alice uses liquidate strategy remove partial of liquidity
    expect((await lp.balanceOf(await alice.getAddress())).toString()).to.eq(
      parseEther("31.622776601683792319").toString()
    );
    await lpAsAlice.transfer(strat.address, ethers.utils.parseEther("31.622776601683792319"));
    await stratAsWorker.execute(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "address", "uint256", "address"],
        [
          baseToken.address,
          baseToken.address,
          farmingToken.address,
          ethers.utils.parseEther("15"),
          await worker.getAddress(),
        ]
      )
    );

    expect(await baseToken.balanceOf(await worker.getAddress())).to.eq(
      parseEther("15.068057486504832330").toString()
    );
  });
});
