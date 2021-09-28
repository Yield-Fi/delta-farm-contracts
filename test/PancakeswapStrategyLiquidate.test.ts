import "@openzeppelin/test-helpers";

import {
  MockToken,
  MockToken__factory,
  PancakeFactory,
  PancakeFactory__factory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  PancakeRouterV2__factory,
  PancakeswapStrategyLiquidate,
  PancakeswapStrategyLiquidate__factory,
  WBNB,
  WBNB__factory,
} from "../typechain";
import { ethers, upgrades, waffle } from "hardhat";

import { Signer } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { parseEther } from "@ethersproject/units";

chai.use(solidity);
const { expect } = chai;

describe("Pancakeswap - StrategyLiquidate", () => {
  const FOREVER = "2000000000";

  /// Pancake-related instance(s)
  let factoryV2: PancakeFactory;
  let routerV2: PancakeRouterV2;
  let lp: PancakePair;

  /// Token-related instance(s)
  let wbnb: WBNB;
  let baseToken: MockToken;
  let farmingToken: MockToken;

  /// Strategy-ralted instance(s)
  let strat: PancakeswapStrategyLiquidate;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;

  // Contract Signer
  let baseTokenAsAlice: MockToken;
  let baseTokenAsBob: MockToken;

  let lpAsBob: PancakePair;

  let farmingTokenAsAlice: MockToken;
  let farmingTokenAsBob: MockToken;

  let routerAsAlice: PancakeRouterV2;
  let routerAsBob: PancakeRouterV2;

  async function fixture() {
    [deployer, alice, bob] = await ethers.getSigners();

    // Setup Pancakeswap
    const PancakeFactoryV2 = (await ethers.getContractFactory(
      "PancakeFactory",
      deployer
    )) as PancakeFactory__factory;
    factoryV2 = await PancakeFactoryV2.deploy(await deployer.getAddress());
    await factoryV2.deployed();

    const WBNB = (await ethers.getContractFactory("WBNB", deployer)) as WBNB__factory;
    wbnb = await WBNB.deploy();
    await wbnb.deployed();

    const PancakeRouterV2 = (await ethers.getContractFactory(
      "PancakeRouterV2",
      deployer
    )) as PancakeRouterV2__factory;
    routerV2 = await PancakeRouterV2.deploy(factoryV2.address, wbnb.address);
    await routerV2.deployed();

    /// Setup token stuffs
    const MockToken = (await ethers.getContractFactory(
      "MockToken",
      deployer
    )) as MockToken__factory;
    baseToken = (await upgrades.deployProxy(MockToken, ["BTOKEN", "BTOKEN"])) as MockToken;
    await baseToken.deployed();
    await baseToken.mint(await alice.getAddress(), ethers.utils.parseEther("100"));
    await baseToken.mint(await bob.getAddress(), ethers.utils.parseEther("100"));
    farmingToken = (await upgrades.deployProxy(MockToken, ["FTOKEN", "FTOKEN"])) as MockToken;
    await farmingToken.deployed();
    await farmingToken.mint(await alice.getAddress(), ethers.utils.parseEther("10"));
    await farmingToken.mint(await bob.getAddress(), ethers.utils.parseEther("10"));

    await factoryV2.createPair(baseToken.address, farmingToken.address);

    lp = PancakePair__factory.connect(
      await factoryV2.getPair(farmingToken.address, baseToken.address),
      deployer
    );

    const PancakeswapV2StrategyLiquidate = (await ethers.getContractFactory(
      "PancakeswapStrategyLiquidate",
      deployer
    )) as PancakeswapStrategyLiquidate__factory;
    strat = (await upgrades.deployProxy(PancakeswapV2StrategyLiquidate, [
      routerV2.address,
    ])) as PancakeswapStrategyLiquidate;
    await strat.deployed();

    // Assign contract signer
    baseTokenAsAlice = MockToken__factory.connect(baseToken.address, alice);
    baseTokenAsBob = MockToken__factory.connect(baseToken.address, bob);

    farmingTokenAsAlice = MockToken__factory.connect(farmingToken.address, alice);
    farmingTokenAsBob = MockToken__factory.connect(farmingToken.address, bob);

    routerAsAlice = PancakeRouterV2__factory.connect(routerV2.address, alice);
    routerAsBob = PancakeRouterV2__factory.connect(routerV2.address, bob);

    lpAsBob = PancakePair__factory.connect(lp.address, bob);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  it("should convert all LP tokens back to baseToken", async () => {
    // Alice adds 0.1 FTOKEN + 1 BTOKEN
    await baseTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("1"));
    await farmingTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("0.1"));
    await routerAsAlice.addLiquidity(
      baseToken.address,
      farmingToken.address,
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("0.1"),
      "0",
      "0",
      await alice.getAddress(),
      FOREVER
    );

    // Bob tries to add 1 FTOKEN + 1 BTOKEN (but obviously can only add 0.1 FTOKEN)
    await baseTokenAsBob.approve(routerV2.address, ethers.utils.parseEther("1"));
    await farmingTokenAsBob.approve(routerV2.address, ethers.utils.parseEther("1"));
    await routerAsBob.addLiquidity(
      baseToken.address,
      farmingToken.address,
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      "0",
      "0",
      await bob.getAddress(),
      FOREVER
    );

    expect((await baseToken.balanceOf(await bob.getAddress())).toString()).to.eq(
      parseEther("99").toString()
    );
    expect((await farmingToken.balanceOf(await bob.getAddress())).toString()).to.eq(
      parseEther("9.9").toString()
    );
    expect((await lp.balanceOf(await bob.getAddress())).toString()).to.eq(
      parseEther("0.316227766016837933").toString()
    );

    // Bob uses liquidate strategy to turn all LPs back to BTOKEN but with an unreasonable expectation
    await lpAsBob.transfer(strat.address, ethers.utils.parseEther("0.316227766016837933"));
    await expect(
      strat.execute(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "address", "uint256"],
          [baseToken.address, farmingToken.address, ethers.utils.parseEther("2")]
        )
      )
    ).to.be.revertedWith("insufficient baseToken received");

    // Bob uses liquidate strategy to turn all LPs back to BTOKEN with a same minimum value
    await strat.execute(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256"],
        [baseToken.address, farmingToken.address, ethers.utils.parseEther("1")]
      )
    );

    expect((await lp.balanceOf(strat.address)).toString()).to.eq(ethers.utils.parseEther("0"));
    expect((await lp.balanceOf(await bob.getAddress())).toString()).to.eq(
      parseEther("0").toString()
    );
    expect((await baseToken.balanceOf(lp.address)).toString()).to.eq(
      parseEther("0.500625782227784731").toString()
    );
    expect((await farmingToken.balanceOf(lp.address)).toString()).to.eq(
      parseEther("0.2").toString()
    );
  });
});