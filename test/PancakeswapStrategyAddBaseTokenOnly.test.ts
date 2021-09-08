import "@openzeppelin/test-helpers";

import { Signer } from "ethers";
import {
  MockToken,
  MockToken__factory,
  PancakeFactory,
  PancakeFactory__factory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  PancakeswapStrategyAddBaseTokenOnly,
  PancakeswapStrategyAddBaseTokenOnly__factory,
  WBNB,
  WBNB__factory,
} from "../typechain";
import { ethers, upgrades, waffle } from "hardhat";

import { PancakeRouterV2__factory } from "../typechain/factories/PancakeRouterV2__factory";
import chai from "chai";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;

describe("PancakeswapV2 - StrategyAddBaseTokenOnly", () => {
  const FOREVER = "2000000000";

  /// Pancakeswap-related instance(s)
  let factoryV2: PancakeFactory;
  let routerV2: PancakeRouterV2;
  let lpV2: PancakePair;

  /// Token-related instance(s)
  let wbnb: WBNB;
  let baseToken: MockToken;
  let farmingToken: MockToken;

  /// Strategy-ralted instance(s)
  let strat: PancakeswapStrategyAddBaseTokenOnly;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;

  // Contract Signer
  let baseTokenAsAlice: MockToken;
  let baseTokenAsBob: MockToken;

  let lpAsBob: PancakePair;

  let farmingTokenAsAlice: MockToken;

  let routerV2AsAlice: PancakeRouterV2;

  let stratAsBob: PancakeswapStrategyAddBaseTokenOnly;

  async function fixture() {
    [deployer, alice, bob] = await ethers.getSigners();

    // Setup Pancakeswap
    const PancakeFactory = (await ethers.getContractFactory(
      "PancakeFactory",
      deployer
    )) as PancakeFactory__factory;
    factoryV2 = await PancakeFactory.deploy(await deployer.getAddress());
    await factoryV2.deployed();

    const WBNB = (await ethers.getContractFactory(
      "WBNB",
      deployer
    )) as WBNB__factory;
    wbnb = await WBNB.deploy();
    await factoryV2.deployed();

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
    baseToken = (await upgrades.deployProxy(MockToken, [
      "BTOKEN",
      "BTOKEN",
    ])) as MockToken;
    await baseToken.deployed();
    await baseToken.mint(
      await alice.getAddress(),
      ethers.utils.parseEther("100")
    );
    await baseToken.mint(
      await bob.getAddress(),
      ethers.utils.parseEther("100")
    );
    farmingToken = (await upgrades.deployProxy(MockToken, [
      "FTOKEN",
      "FTOKEN",
    ])) as MockToken;
    await farmingToken.deployed();
    await farmingToken.mint(
      await alice.getAddress(),
      ethers.utils.parseEther("10")
    );
    await farmingToken.mint(
      await bob.getAddress(),
      ethers.utils.parseEther("10")
    );

    await factoryV2.createPair(baseToken.address, farmingToken.address);

    lpV2 = PancakePair__factory.connect(
      await factoryV2.getPair(farmingToken.address, baseToken.address),
      deployer
    );

    const PancakeswapStrategyAddBaseTokenOnly =
      (await ethers.getContractFactory(
        "PancakeswapStrategyAddBaseTokenOnly",
        deployer
      )) as PancakeswapStrategyAddBaseTokenOnly__factory;
    strat = (await upgrades.deployProxy(PancakeswapStrategyAddBaseTokenOnly, [
      routerV2.address,
    ])) as PancakeswapStrategyAddBaseTokenOnly;
    await strat.deployed();

    // Assign contract signer
    baseTokenAsAlice = MockToken__factory.connect(baseToken.address, alice);
    baseTokenAsBob = MockToken__factory.connect(baseToken.address, bob);

    farmingTokenAsAlice = MockToken__factory.connect(
      farmingToken.address,
      alice
    );

    routerV2AsAlice = PancakeRouterV2__factory.connect(routerV2.address, alice);

    lpAsBob = PancakePair__factory.connect(lpV2.address, bob);

    stratAsBob = PancakeswapStrategyAddBaseTokenOnly__factory.connect(
      strat.address,
      bob
    );
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  it("should revert on bad calldata", async () => {
    // Bob passes some bad calldata that can't be decoded
    await expect(stratAsBob.execute(await bob.getAddress(), "0", "0x1234")).to
      .be.reverted;
  });

  it("should convert all BTOKEN to LP tokens at best rate", async () => {
    // Alice adds 0.1 FTOKEN + 1 WBTC
    await farmingTokenAsAlice.approve(
      routerV2.address,
      ethers.utils.parseEther("0.1")
    );
    await baseTokenAsAlice.approve(
      routerV2.address,
      ethers.utils.parseEther("1")
    );

    // Add liquidity to the WBTC-FTOKEN pool on Pancakeswap
    await routerV2AsAlice.addLiquidity(
      baseToken.address,
      farmingToken.address,
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("0.1"),
      "0",
      "0",
      await alice.getAddress(),
      FOREVER
    );

    // Bob transfer 0.1 WBTC to StrategyAddBaseTokenOnly first
    await baseTokenAsBob.transfer(
      strat.address,
      ethers.utils.parseEther("0.1")
    );
    // Bob uses AddBaseTokenOnly strategy to add 0.1 WBTC
    await stratAsBob.execute(
      await bob.getAddress(),
      "0",
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256"],
        [baseToken.address, farmingToken.address, "0"]
      )
    );

    expect(await lpV2.balanceOf(await bob.getAddress())).to.be.bignumber.eq(
      ethers.utils.parseEther("0.015415396042372718")
    );
    expect(await lpV2.balanceOf(strat.address)).to.be.bignumber.eq(
      ethers.utils.parseEther("0")
    );
    expect(await farmingToken.balanceOf(strat.address)).to.be.bignumber.eq(
      ethers.utils.parseEther("0")
    );

    // Bob uses AddBaseTokenOnly strategy to add another 0.1 WBTC
    await baseTokenAsBob.transfer(
      strat.address,
      ethers.utils.parseEther("0.1")
    );
    await lpAsBob.transfer(
      strat.address,
      ethers.utils.parseEther("0.015415396042372718")
    );
    await stratAsBob.execute(
      await bob.getAddress(),
      "0",
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256"],
        [
          baseToken.address,
          farmingToken.address,
          ethers.utils.parseEther("0.01"),
        ]
      )
    );

    expect(await lpV2.balanceOf(await bob.getAddress())).to.be.bignumber.eq(
      ethers.utils.parseEther("0.030143763464109982")
    );
    expect(await lpV2.balanceOf(strat.address)).to.be.bignumber.eq(
      ethers.utils.parseEther("0")
    );
    expect(await farmingToken.balanceOf(strat.address)).to.be.bignumber.eq(
      ethers.utils.parseEther("0")
    );
    expect(await baseToken.balanceOf(strat.address)).to.be.bignumber.eq(
      ethers.utils.parseEther("0")
    );

    // Bob uses AddBaseTokenOnly strategy yet again, but now with an unreasonable min LP request
    await baseTokenAsBob.transfer(
      strat.address,
      ethers.utils.parseEther("0.1")
    );
    await expect(
      stratAsBob.execute(
        await bob.getAddress(),
        "0",
        ethers.utils.defaultAbiCoder.encode(
          ["address", "address", "uint256"],
          [
            baseToken.address,
            farmingToken.address,
            ethers.utils.parseEther("0.05"),
          ]
        )
      )
    ).to.be.revertedWith("insufficient LP tokens received");
  });
});
