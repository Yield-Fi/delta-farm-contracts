import "@openzeppelin/test-helpers";

import {
  AToken__factory,
  LendingPool,
  MockToken,
  MockToken__factory,
  ProtocolManager,
  SpookySwapStrategyBorrowAndAddToPoolWithBaseToken,
  SpookySwapStrategyBorrowAndAddToPoolWithBaseToken__factory,
  UniswapV2Factory,
  UniswapV2Factory__factory,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  UniswapV2Router02,
  UniswapV2Router02__factory,
  VariableDebtToken__factory,
  WBNB,
  WBNB__factory,
} from "../../typechain";
import { ethers, upgrades, waffle } from "hardhat";

import { constants, Signer } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { parseEther, formatEther } from "@ethersproject/units";
import { deployProxyContract } from "../helpers";
import { deployGeistFinance } from "../helpers/deployGeistFinance";
import { assertAlmostEqual } from "../helpers/assert";

chai.use(solidity);
const { expect } = chai;

describe("SpookySwapStrategyBorrowAndAddToPoolWithBaseToken", () => {
  const FOREVER = "2000000000";

  let protocolManager: ProtocolManager;

  /// Uniswap-related instance(s)
  let factoryV2: UniswapV2Factory;
  let routerV2: UniswapV2Router02;
  let lpV2: UniswapV2Pair;

  /// Token-related instance(s)
  let wbnb: WBNB;
  let baseToken: MockToken;
  let farmingToken: MockToken;

  /// Strategy-ralted instance(s)
  let strat: SpookySwapStrategyBorrowAndAddToPoolWithBaseToken;

  // Accounts
  let deployer: Signer;
  let alice: Signer;
  let bob: Signer;

  // Contract Signer
  let baseTokenAsAlice: MockToken;
  let baseTokenAsBob: MockToken;

  let lpAsBob: UniswapV2Pair;

  let farmingTokenAsAlice: MockToken;

  let routerV2AsAlice: UniswapV2Router02;

  let stratAsBob: SpookySwapStrategyBorrowAndAddToPoolWithBaseToken;

  let LendingPool: LendingPool;

  async function fixture() {
    [deployer, alice, bob] = await ethers.getSigners();

    protocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[await deployer.getAddress()]],
      deployer
    )) as ProtocolManager;

    // Setup Spookyswap
    const UniswapV2Factory = (await ethers.getContractFactory(
      "UniswapV2Factory",
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
    await baseToken.mint(await alice.getAddress(), ethers.utils.parseEther("10000000"));
    await baseToken.mint(await bob.getAddress(), ethers.utils.parseEther("100000"));
    await baseToken.mint(await deployer.getAddress(), ethers.utils.parseEther("10000000"));
    farmingToken = await MockTokenFactory.deploy("FTOKEN", "FTOKEN");
    await farmingToken.deployed();
    await farmingToken.mint(await alice.getAddress(), ethers.utils.parseEther("10000000"));
    await farmingToken.mint(await bob.getAddress(), ethers.utils.parseEther("10000"));
    await farmingToken.mint(await deployer.getAddress(), ethers.utils.parseEther("10000000"));

    await factoryV2.createPair(baseToken.address, farmingToken.address);

    lpV2 = UniswapV2Pair__factory.connect(
      await factoryV2.getPair(farmingToken.address, baseToken.address),
      deployer
    );

    [LendingPool] = await deployGeistFinance(deployer, [
      {
        asset: baseToken,
        amount: parseEther("10000"),
        price: parseEther("10"),
        lendingRate: parseEther("0.6"),
        ltw: 8000,
        liquidationThreshold: 8500,
        liquidationBonus: 11000,
      },
      {
        asset: farmingToken,
        amount: parseEther("10000"),
        price: parseEther("1"),
        lendingRate: parseEther("0.6"),
        ltw: 8000,
        liquidationThreshold: 8500,
        liquidationBonus: 11000,
      },
    ]);

    const SpookySwapStrategyBorrowAndAddToPoolWithBaseToken = (await ethers.getContractFactory(
      "SpookySwapStrategyBorrowAndAddToPoolWithBaseToken",
      deployer
    )) as SpookySwapStrategyBorrowAndAddToPoolWithBaseToken__factory;
    strat = (await upgrades.deployProxy(SpookySwapStrategyBorrowAndAddToPoolWithBaseToken, [
      routerV2.address,
      LendingPool.address,
      protocolManager.address,
    ])) as SpookySwapStrategyBorrowAndAddToPoolWithBaseToken;
    await strat.deployed();

    // Assign contract signer
    baseTokenAsAlice = MockToken__factory.connect(baseToken.address, alice);
    baseTokenAsBob = MockToken__factory.connect(baseToken.address, bob);

    farmingTokenAsAlice = MockToken__factory.connect(farmingToken.address, alice);

    routerV2AsAlice = UniswapV2Router02__factory.connect(routerV2.address, alice);

    lpAsBob = UniswapV2Pair__factory.connect(lpV2.address, bob);

    stratAsBob = SpookySwapStrategyBorrowAndAddToPoolWithBaseToken__factory.connect(
      strat.address,
      bob
    );
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  it("should revert on bad calldata", async () => {
    // Bob passes some bad calldata that can't be decoded
    await expect(stratAsBob.execute("0x1234")).to.be.reverted;
  });

  it("should convert all BTOKEN to LP tokens at best rate", async () => {
    // Alice adds 10 BASE TOKEN AND 1 FARMING TOKEN
    await baseTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("1"));
    await farmingTokenAsAlice.approve(routerV2.address, ethers.utils.parseEther("10"));

    const bobAddress = await bob.getAddress();

    const baseTokenReserve = await LendingPool.getReserveData(baseToken.address);
    const farmingTokenReserve = await LendingPool.getReserveData(farmingToken.address);

    const GTokenAsBob = AToken__factory.connect(baseTokenReserve.aTokenAddress, bob);
    const VariableDebtTokenAsBob = VariableDebtToken__factory.connect(
      farmingTokenReserve.variableDebtTokenAddress,
      bob
    );

    // Add liquidity to the BASE TOKEN - FARMING TOKEN pool on Uniswap
    await routerV2AsAlice.addLiquidity(
      baseToken.address,
      farmingToken.address,
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("10"),
      "0",
      "0",
      await alice.getAddress(),
      FOREVER
    );

    // Bob transfer 0.1 BASE TOKEN to StrategyAddBaseTokenOnly first
    await baseTokenAsBob.transfer(strat.address, ethers.utils.parseEther("0.1"));

    // Bob increase borrow allowance
    await VariableDebtTokenAsBob.approveDelegation(strat.address, constants.MaxInt256);

    // Bob uses AddBaseTokenOnly strategy to add 0.1 BASE TOKEN
    await (
      await stratAsBob.execute(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "address", "uint256"],
          [baseToken.address, farmingToken.address, "0"]
        ),
        { gasLimit: 10000000 }
      )
    ).wait();

    assertAlmostEqual(await lpV2.balanceOf(bobAddress), parseEther("0.140545673785261302"));
    assertAlmostEqual(await GTokenAsBob.balanceOf(bobAddress), parseEther("0.055555555555555555"));
    assertAlmostEqual(
      await VariableDebtTokenAsBob.balanceOf(bobAddress),
      parseEther("0.44444444444444444")
    );
    expect(formatEther(await lpV2.balanceOf(strat.address))).to.eq("0.0");

    // Bob uses AddBaseTokenOnly strategy to add another 0.1 BASE TOKEN
    await baseTokenAsBob.transfer(strat.address, ethers.utils.parseEther("0.1"));
    await lpAsBob.transfer(strat.address, ethers.utils.parseEther("0.140545673785261302"));
    await stratAsBob.execute(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256"],
        [baseToken.address, farmingToken.address, ethers.utils.parseEther("0.01")]
      )
    );

    assertAlmostEqual(await lpV2.balanceOf(bobAddress), parseEther("0.28109134757048299"));
    assertAlmostEqual(await GTokenAsBob.balanceOf(bobAddress), parseEther("0.111111111111111111"));
    assertAlmostEqual(
      await VariableDebtTokenAsBob.balanceOf(bobAddress),
      parseEther("0.888888888888888889")
    );
    expect(formatEther(await lpV2.balanceOf(strat.address))).to.eq("0.0");

    // Ignore some dust
    expect(Number(formatEther(await baseToken.balanceOf(strat.address)))).to.lessThanOrEqual(
      0.0000000001
    );
    expect(Number(formatEther(await farmingToken.balanceOf(strat.address)))).to.lessThanOrEqual(
      0.0000000001
    );

    // Bob uses AddBaseTokenOnly strategy yet again, but now with an unreasonable min LP request
    await baseTokenAsBob.transfer(strat.address, ethers.utils.parseEther("0.1"));
    await expect(
      stratAsBob.execute(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "address", "uint256"],
          [baseToken.address, farmingToken.address, ethers.utils.parseEther("0.15")]
        )
      )
    ).to.be.revertedWith("Insufficient LP tokens received");
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

    expect(formatEther(firstPartOfBaseToken)).to.be.eq("0.555555555555555555");
    expect(formatEther(secondPartOfBaseToken)).to.be.eq("0.444444444444444445");
    expect(formatEther(firstPartOfBaseToken.add(secondPartOfBaseToken))).to.be.eq("1.0");
    expect(formatEther(amountOfToken0)).to.be.eq("4.44444444444444444");
    /// 1 BASE TOKEN = 10 TOKEN1
    /// 4.4 BASE TOKEN ~= 0.44 TOKEN0
    expect(formatEther(amountOfToken1)).to.be.eq("0.444444444444444445");
  });
});
