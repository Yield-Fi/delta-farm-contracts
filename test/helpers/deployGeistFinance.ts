import { BigNumberish, Signer } from "ethers";
import { arrayify, parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { ERC20 } from "../../typechain";

type Reserve = {
  asset: ERC20;
  amount: BigNumberish | number;
  price: BigNumberish | number;
  lendingRate: BigNumberish | number;
  ltw: number;
  liquidationThreshold: number;
  liquidationBonus: number;
};

export const deployGeistFinance = async (deployer: Signer, reserves: Reserve[]) => {
  const LendingPoolAddressesProviderFactory = await ethers.getContractFactory(
    "LendingPoolAddressesProvider"
  );
  const LendingPoolAddressesProvider = await LendingPoolAddressesProviderFactory.deploy("0");
  await LendingPoolAddressesProvider.setPoolAdmin(await deployer.getAddress());

  const ReserveLogicFactory = await ethers.getContractFactory("ReserveLogic");
  const ReserveLogic = await ReserveLogicFactory.deploy();

  const GenericLogicFactory = await ethers.getContractFactory("GenericLogic");
  const GenericLogic = await GenericLogicFactory.deploy();

  const ValidationLogicFactory = await ethers.getContractFactory("ValidationLogic", {
    libraries: {
      GenericLogic: GenericLogic.address,
    },
  });
  const ValidationLogic = await ValidationLogicFactory.deploy();

  const LendingPoolFactory = await ethers.getContractFactory("LendingPool", {
    libraries: {
      ReserveLogic: ReserveLogic.address,
      ValidationLogic: ValidationLogic.address,
    },
  });
  const LendingPool = await LendingPoolFactory.deploy();
  await LendingPool.deployed();
  await LendingPool.initialize(LendingPoolAddressesProvider.address);
  const lendingPoolAddressId = ethers.utils.formatBytes32String("LENDING_POOL");
  await LendingPoolAddressesProvider.setAddress(lendingPoolAddressId, LendingPool.address);

  const LendingPoolConfiguratorFactory = await ethers.getContractFactory("LendingPoolConfigurator");
  const LendingPoolConfigurator = await LendingPoolConfiguratorFactory.deploy();
  await LendingPoolConfigurator.deployed();
  await LendingPoolConfigurator.initialize(LendingPoolAddressesProvider.address);
  const lendingPoolConfiguratorAddressId = ethers.utils.formatBytes32String(
    "LENDING_POOL_CONFIGURATOR"
  );
  await LendingPoolAddressesProvider.setAddress(
    lendingPoolConfiguratorAddressId,
    LendingPoolConfigurator.address
  );

  const LendingRateOracleFactory = await ethers.getContractFactory("LendingRateOracle");
  const LendingRateOracle = await LendingRateOracleFactory.deploy();
  await LendingRateOracle.deployed();
  await LendingPoolAddressesProvider.setLendingRateOracle(LendingRateOracle.address);

  const PriceOracleFactory = await ethers.getContractFactory("PriceOracle");
  const PriceOracle = await PriceOracleFactory.deploy();
  await PriceOracle.deployed();
  await LendingPoolAddressesProvider.setPriceOracle(PriceOracle.address);

  const GTokenFactory = await ethers.getContractFactory("AToken");
  const GToken = await GTokenFactory.deploy();
  await GToken.deployed();

  const ChefIncentivesControllerFactory = await ethers.getContractFactory(
    "ChefIncentivesController"
  );

  const GeistTokenFactory = await ethers.getContractFactory("GeistToken");
  const GeistToken = await GeistTokenFactory.deploy(parseEther("1000000000"));
  await GeistToken.deployed();

  const MultiFeeDistributionFactory = await ethers.getContractFactory("MultiFeeDistribution");
  const MultiFeeDistribution = await MultiFeeDistributionFactory.deploy(GeistToken.address);
  await MultiFeeDistribution.transferOwnership(LendingPoolConfigurator.address);

  const ChefIncentivesController = await ChefIncentivesControllerFactory.deploy(
    [0],
    [parseEther("1")],
    LendingPoolConfigurator.address,
    MultiFeeDistribution.address,
    parseEther("1000000000")
  );

  const DefaultReserveInterestRateStrategyFactory = await ethers.getContractFactory(
    "DefaultReserveInterestRateStrategy"
  );
  const DefaultReserveInterestRateStrategy = await DefaultReserveInterestRateStrategyFactory.deploy(
    LendingPoolAddressesProvider.address,
    "800000000000000000000000000",
    0,
    "40000000000000000000000000",
    "750000000000000100000000000",
    0,
    0
  );
  await DefaultReserveInterestRateStrategy.deployed();

  const VariableDebtTokenFactory = await ethers.getContractFactory("VariableDebtToken");
  const VariableDebtToken = await VariableDebtTokenFactory.deploy();
  await VariableDebtToken.deployed();

  const StableDebtTokenFactory = await ethers.getContractFactory("StableDebtToken");
  const StableDebtToken = await StableDebtTokenFactory.deploy();
  await StableDebtToken.deployed();

  const reserveParams = [];

  // Configure reserves
  for (const reserve of reserves) {
    const underlyingAssetName = await reserve.asset.name();
    const underlyingAssetDecimals = await reserve.asset.decimals();
    const underlyingAssetSymbol = await reserve.asset.symbol();

    await PriceOracle.setAssetPrice(reserve.asset.address, reserve.price);
    await LendingRateOracle.setMarketBorrowRate(reserve.asset.address, reserve.lendingRate);

    reserveParams.push({
      aTokenImpl: GToken.address,
      aTokenName: `Geist ${underlyingAssetName}`,
      aTokenSymbol: `g${underlyingAssetSymbol}`,
      allocPoint: 100,
      incentivesController: ChefIncentivesController.address,
      interestRateStrategyAddress: DefaultReserveInterestRateStrategy.address,
      underlyingAsset: reserve.asset.address,
      underlyingAssetName,
      underlyingAssetDecimals,
      variableDebtTokenImpl: VariableDebtToken.address,
      variableDebtTokenName: `debt variable ${underlyingAssetName}`,
      variableDebtTokenSymbol: `dv${underlyingAssetSymbol}`,
      stableDebtTokenImpl: StableDebtToken.address,
      stableDebtTokenName: `debt stable ${underlyingAssetName}`,
      stableDebtTokenSymbol: `ds${underlyingAssetSymbol}`,
      treasury: MultiFeeDistribution.address,
      params: arrayify(0),
    });

    await LendingPoolConfigurator.configureReserveAsCollateral(
      reserve.asset.address,
      reserve.ltw,
      reserve.liquidationThreshold,
      reserve.liquidationBonus
    );
    await LendingPoolConfigurator.enableBorrowingOnReserve(reserve.asset.address, true);
    await LendingPoolConfigurator.disableReserveStableRate(reserve.asset.address);
  }

  await LendingPoolConfigurator.batchInitReserve(reserveParams);

  // Add some funds to reserves
  for (const reserve of reserves) {
    await reserve.asset.approve(LendingPool.address, reserve.amount);

    await LendingPool.deposit(
      reserve.asset.address,
      reserve.amount,
      await deployer.getAddress(),
      0
    );
  }

  return [LendingPool] as const;
};
