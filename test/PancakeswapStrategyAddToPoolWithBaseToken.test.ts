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
  PancakeswapStrategyAddToPoolWithBaseToken,
  PancakeswapStrategyAddToPoolWithBaseToken__factory,
  ProtocolManager,
  WBNB,
  WBNB__factory,
} from "../typechain";
import { ethers, upgrades, waffle } from "hardhat";

import { Signer } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { parseEther } from "@ethersproject/units";
import { formatEther } from "ethers/lib/utils";
import { deployProxyContract } from "./helpers";

chai.use(solidity);
const { expect } = chai;

describe("PancakeswapStrategyAddToPoolWithBaseToken", () => {
  const FOREVER = "2000000000";

  let protocolManager: ProtocolManager;

  /// Pancakeswap-related instance(s)
  let factoryV2: PancakeFactory;
  let routerV2: PancakeRouterV2;
  let lpV2: PancakePair;

  /// Token-related instance(s)
  let wbnb: WBNB;
  let baseToken: MockToken;
  let farmingToken: MockToken;

  /// Strategy-ralted instance(s)
  let strat: PancakeswapStrategyAddToPoolWithBaseToken;

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

  let stratAsBob: PancakeswapStrategyAddToPoolWithBaseToken;

  async function fixture() {
    [deployer, alice, bob] = await ethers.getSigners();

    protocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[await deployer.getAddress()]],
      deployer
    )) as ProtocolManager;

    // Setup Pancakeswap
    const PancakeFactory = (await ethers.getContractFactory(
      "PancakeFactory",
      deployer
    )) as PancakeFactory__factory;
    factoryV2 = await PancakeFactory.deploy(await deployer.getAddress());
    await factoryV2.deployed();

    const WBNB = (await ethers.getContractFactory("WBNB", deployer)) as WBNB__factory;
    wbnb = await WBNB.deploy();
    await factoryV2.deployed();

    await protocolManager.setStables([wbnb.address]);

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
    await baseToken.mint(await alice.getAddress(), ethers.utils.parseEther("100000"));
    await baseToken.mint(await bob.getAddress(), ethers.utils.parseEther("100000"));
    farmingToken = (await upgrades.deployProxy(MockToken, ["FTOKEN", "FTOKEN"])) as MockToken;
    await farmingToken.deployed();
    await farmingToken.mint(await alice.getAddress(), ethers.utils.parseEther("10000"));
    await farmingToken.mint(await bob.getAddress(), ethers.utils.parseEther("10000"));

    await factoryV2.createPair(baseToken.address, farmingToken.address);

    lpV2 = PancakePair__factory.connect(
      await factoryV2.getPair(farmingToken.address, baseToken.address),
      deployer
    );

    const PancakeswapStrategyAddToPoolWithBaseToken = (await ethers.getContractFactory(
      "PancakeswapStrategyAddToPoolWithBaseToken",
      deployer
    )) as PancakeswapStrategyAddToPoolWithBaseToken__factory;
    strat = (await upgrades.deployProxy(PancakeswapStrategyAddToPoolWithBaseToken, [
      routerV2.address,
      protocolManager.address,
    ])) as PancakeswapStrategyAddToPoolWithBaseToken;
    await strat.deployed();

    // Assign contract signer
    baseTokenAsAlice = MockToken__factory.connect(baseToken.address, alice);
    baseTokenAsBob = MockToken__factory.connect(baseToken.address, bob);

    farmingTokenAsAlice = MockToken__factory.connect(farmingToken.address, alice);

    routerV2AsAlice = PancakeRouterV2__factory.connect(routerV2.address, alice);

    lpAsBob = PancakePair__factory.connect(lpV2.address, bob);

    stratAsBob = PancakeswapStrategyAddToPoolWithBaseToken__factory.connect(strat.address, bob);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  it("should revert on bad calldata", async () => {
    // Bob passes some bad calldata that can't be decoded
    await expect(stratAsBob.execute("0x1234")).to.be.reverted;
  });

  it("should convert all BTOKEN to LP tokens at best rate", async () => {
    // Alice adds 0.1 FTOKEN + 1 WBTC
    await baseTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("10"));
    await farmingTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("1"));

    // Add liquidity to the WBTC-FTOKEN pool on Pancakeswap
    await routerV2AsAlice.addLiquidity(
      baseToken.address,
      farmingToken.address,
      ethers.utils.parseEther("10"),
      ethers.utils.parseEther("1"),
      "0",
      "0",
      await alice.getAddress(),
      FOREVER
    );

    // Bob transfer 0.1 WBTC to StrategyAddBaseTokenOnly first
    await baseTokenAsBob.transfer(strat.address, ethers.utils.parseEther("0.1"));
    // Bob uses AddBaseTokenOnly strategy to add 0.1 WBTC
    await stratAsBob.execute(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256"],
        [baseToken.address, farmingToken.address, "0"]
      )
    );

    expect(await (await lpV2.balanceOf(await bob.getAddress())).toString()).to.eq(
      parseEther("0.015732724677454621").toString()
    );

    expect(await (await lpV2.balanceOf(strat.address)).toString()).to.eq(
      parseEther("0").toString()
    );

    // Bob uses AddBaseTokenOnly strategy to add another 0.1 WBTC
    await baseTokenAsBob.transfer(strat.address, ethers.utils.parseEther("0.1"));
    await lpAsBob.transfer(strat.address, ethers.utils.parseEther("0.015415396042372718"));
    await stratAsBob.execute(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256"],
        [baseToken.address, farmingToken.address, ethers.utils.parseEther("0.01")]
      )
    );

    expect((await lpV2.balanceOf(await bob.getAddress())).toString()).to.eq(
      parseEther("0.031387948248123750").toString()
    );
    expect((await lpV2.balanceOf(strat.address)).toString()).to.eq(parseEther("0").toString());
    // expect((await farmingToken.balanceOf(strat.address)).toString()).to.eq(
    //   parseEther("0").toString()
    // );
    // expect((await baseToken.balanceOf(strat.address)).toString()).to.eq(parseEther("0").toString());

    // Bob uses AddBaseTokenOnly strategy yet again, but now with an unreasonable min LP request
    await baseTokenAsBob.transfer(strat.address, ethers.utils.parseEther("0.1"));
    await expect(
      stratAsBob.execute(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "address", "uint256"],
          [baseToken.address, farmingToken.address, ethers.utils.parseEther("0.05")]
        )
      )
    ).to.be.revertedWith("insufficient LP tokens received");
  });

  it("Should estimate amounts of base token after split and converting to token0", async () => {
    await baseTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("1000"));
    await farmingTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("10000"));

    await routerV2AsAlice.addLiquidity(
      baseToken.address,
      farmingToken.address,
      ethers.utils.parseEther("1000"),
      ethers.utils.parseEther("10000"),
      "0",
      "0",
      await alice.getAddress(),
      FOREVER
    );

    const [firstPartOfBaseToken, secondPartOfBaseToken, amountOfToken0, amountOfToken1] =
      await strat.callStatic.estimateAmounts(
        baseToken.address,
        baseToken.address,
        farmingToken.address,
        parseEther("1")
      );

    expect(firstPartOfBaseToken.toString()).to.be.eq(parseEther("0.500000000000000000").toString());
    expect(secondPartOfBaseToken.toString()).to.be.eq(
      parseEther("0.500000000000000000").toString()
    );
    expect(firstPartOfBaseToken.add(secondPartOfBaseToken).toString()).to.be.eq(
      parseEther("1").toString()
    );
    expect(amountOfToken0.toString()).to.be.eq(parseEther("0.500000000000000000").toString());
    /// 1 BASE TOKEN = 10 TOKEN1
    /// 0.5 BASE TOKEN ~= 0.5 TOKEN0 - some trading fee
    expect(amountOfToken1.toString()).to.be.eq(parseEther("4.985013724404953029").toString());
  });
});
