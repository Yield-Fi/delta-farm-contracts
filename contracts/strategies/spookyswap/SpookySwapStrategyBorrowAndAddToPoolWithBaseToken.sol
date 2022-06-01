// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "../../libs/spookyswap/core/interfaces/IUniswapV2Factory.sol";
import "../../libs/spookyswap/core/interfaces/IUniswapV2Pair.sol";
import "../../libs/spookyswap/core/interfaces/IUniswapV2Router02.sol";
import "../../libs/spookyswap/core/libraries/UniswapV2Library.sol";

import "../../interfaces/IStrategy.sol";
import "../../interfaces/IProtocolManager.sol";
import "../../interfaces/IGeistLendingPool.sol";
import "../../utils/SafeToken.sol";
import "../../utils/CustomMath.sol";

/// @dev Contract of strategy to adding liquidity to the Spookyswap's pools. The strategy split deposited base token on the two parts.
/// 1. Fist part is deposited as collateral on the geist finance protocol to get possibility to borrow second asset of given pair in the Spookyswap's pool.
/// 2. Second part is added directly to the pool along with borrowed asset.
/// 3. Contract returns back LP token, gTokens and debtTokens to the worker.
contract SpookySwapStrategyBorrowAndAddToPoolWithBaseToken is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IAddStrategy
{
  using SafeToken for address;
  using SafeMath for uint256;

  IUniswapV2Factory public factory;
  IUniswapV2Router02 public router;
  IGeistLendingPool public lendingPool;
  IPriceOracleGetter public priceOracle;
  IProtocolManager public protocolManager;

  /// @dev Create a new add Token only strategy instance.
  /// @param _router The SpookySwap Router smart contract.
  /// @param _lendingPool The Geist Finance lending pool smart contract.
  /// @param _protocolManager The ProtocolManager smart contract.
  function initialize(IUniswapV2Router02 _router, IGeistLendingPool _lendingPool, IProtocolManager _protocolManager)
    external
    initializer
  {
    __Ownable_init();
    __ReentrancyGuard_init();

    factory = IUniswapV2Factory(_router.factory());
    router = _router;
    lendingPool = _lendingPool;
    priceOracle = IPriceOracleGetter(lendingPool.getAddressesProvider().getPriceOracle());
    protocolManager = _protocolManager;
  }

  /// @dev Execute worker strategy. Take BaseToken. Return LP tokens.
  /// @param data Extra calldata information passed along to this strategy.
  function execute(bytes calldata data) external override nonReentrant returns (uint256) {
    // 1. Find out what farming token we are dealing with and min additional LP tokens.
    (address baseToken, address farmingToken, uint256 minLPAmount) = abi.decode(
      data,
      (address, address, uint256)
    );

    IUniswapV2Pair lpToken = IUniswapV2Pair(factory.getPair(farmingToken, baseToken));

    // 2. Deposit estimated value of base token as collateral
    uint256 amountToDepositAsCollateral = _calculateBaseTokenAmountToDepositAsCollateral(baseToken, farmingToken, baseToken.myBalance());
    baseToken.safeApprove(address(lendingPool), amountToDepositAsCollateral);
    lendingPool.deposit(baseToken, amountToDepositAsCollateral, msg.sender, 0);

    // 3. Borrow all available farming tokens
    (, , uint256 availableBorrowsETH, , , ) = lendingPool.getUserAccountData(msg.sender);
    uint256 farmingReserveDecimals = _getReserveDecimals(farmingToken);
    uint256 amountToBorrow = availableBorrowsETH.mul(10 ** farmingReserveDecimals).div(priceOracle.getAssetPrice(farmingToken));
    lendingPool.borrow(farmingToken, amountToBorrow, 2, 0, msg.sender);

    // 4. Mint more LP tokens and return all LP tokens to the sender.
    baseToken.safeApprove(address(router), uint256(-1));
    farmingToken.safeApprove(address(router), uint256(-1));
    (, , uint256 moreLPAmount) = router.addLiquidity(
      baseToken,
      farmingToken,
      baseToken.myBalance(),
      farmingToken.myBalance(),
      0,
      0,
      address(this),
      block.timestamp
    );

    require(
      moreLPAmount >= minLPAmount,
      "Insufficient LP tokens received"
    );
    require(
      lpToken.transfer(msg.sender, lpToken.balanceOf(address(this))),
      "Failed to transfer LP token to msg.sender"
    );
    // 5. Reset approval for safety reason
    baseToken.safeApprove(address(router), 0);
    farmingToken.safeApprove(address(router), 0);
    return lpToken.balanceOf(address(this));
  }

  /// @dev Function to estimate amounts of split and swap of the base token
  /// @param baseToken Address of the base token
  /// @param token0 Address of the first of the token in pancake swap's pool
  /// @param token1 Address of the second of the token in pancake swap's pool
  /// @param amount Amount of base token to deposit
  /// @return uint256 Amount of the part of the base token after split
  /// @return uint256 Amount of the part of the base token after split
  /// @return uint256 Amount of the token0 which will be received from swapped base token
  /// @return uint256 Amount of the token1 which will be received from swapped base token
  function estimateAmounts(
    address baseToken,
    address token0,
    address token1,
    uint256 amount
  )
    external
    override
    returns (
      uint256,
      uint256,
      uint256,
      uint256
    )
  {
    uint256 firstPartOfBaseToken = _calculateBaseTokenAmountToDepositAsCollateral(
      baseToken,
      baseToken == token0 ? token1 : token0,
      amount
    );

    uint256 secondPartOfBaseToken = amount.sub(firstPartOfBaseToken);

    // 2. Estimate amounts and return it
    return
      baseToken == token0
        ? (
          firstPartOfBaseToken,
          secondPartOfBaseToken,
          _calculateAvailableAmountToBorrowAfterDepositCollateral(baseToken, token1, firstPartOfBaseToken),
          secondPartOfBaseToken
        )
        : (
          firstPartOfBaseToken,
          secondPartOfBaseToken,
          _calculateAvailableAmountToBorrowAfterDepositCollateral(baseToken, token0, firstPartOfBaseToken),
          secondPartOfBaseToken
        );
  }

  /// @dev Getter to calculate the amount of base token to deposit as collateral
  /// @param baseToken Address of the base token
  /// @param farmingToken Address of the second asset in the spookyswap pool
  /// @param baseTokenBalance Balance of the base token on the contract
  /// @return uint256 Amount of base token to deposit as collateral
  function _calculateBaseTokenAmountToDepositAsCollateral(
    address baseToken,
    address farmingToken,
    uint256 baseTokenBalance
  ) private view returns (uint256) {
    (uint256 x, uint256 y) = _estimateSplit(baseToken, farmingToken);

    uint256 baseTokenAmountToDeposit = baseTokenBalance.mul(y).div(x.add(y));

    return baseTokenAmountToDeposit;
  }

  /// @dev Function to estimate proportions in which base token will be splitted before depositing and borrowing on geist finance
  /// @param baseToken Address of base token
  /// @param farmingToken Address of second asset in the spookyswap pool
  /// @return uint256 First proportion of the base token after split
  /// @return uint256 Second proportion of the base token after split
  function _estimateSplit(address baseToken, address farmingToken)
    private
    view
    returns (uint256, uint256)
  {
    (uint256 baseTokenLiquidity, uint256 farmingTokenLiquidity) = UniswapV2Library.getReserves(
      address(factory),
      baseToken,
      farmingToken
    );
    uint256 ltw = _getLTW(baseToken);

    uint256 baseTokenUSDPrice = priceOracle.getAssetPrice(baseToken);
    uint256 farmingTokenUSDPrice = priceOracle.getAssetPrice(farmingToken);

    uint256 baseTokenLiquidityUSD = baseTokenLiquidity.mul(baseTokenUSDPrice);
    uint256 farmingTokenLiquidityUSD = farmingTokenLiquidity.mul(farmingTokenUSDPrice);

    // Calculate the amount to deposit as collateral for farming token liquidity
    uint256 collateralForFarmingTokenLiquidityUSD = farmingTokenLiquidityUSD.mul(10000).div(ltw);

    return (baseTokenLiquidityUSD, collateralForFarmingTokenLiquidityUSD);
  }

  /// @dev Function to calculate the amount of specific asset which can be borrowed after depositing collateral
  /// @param tokenAsCollateral Address of the token which will be deposited as collateral
  /// @param tokenToBorrow Address of the token which will be borrowed
  /// @param amountToDepositAsCollateral Amount of the token which will be deposited as collateral
  /// @return uint256 Amount of the token which can be borrowed after depositing collateral
  function _calculateAvailableAmountToBorrowAfterDepositCollateral(address tokenAsCollateral, address tokenToBorrow, uint256 amountToDepositAsCollateral)
    internal
    view
    returns (uint256)
  {
    uint256 ltw = _getLTW(tokenAsCollateral);

    uint256 tokenAsCollateralUSD = priceOracle.getAssetPrice(tokenAsCollateral);
    uint256 tokenToBorrowUSD = priceOracle.getAssetPrice(tokenToBorrow);

    uint256 amountToBorrowUSD = amountToDepositAsCollateral.mul(tokenAsCollateralUSD).mul(ltw).div(10000);

    uint256 amountToBorrow = amountToBorrowUSD.div(tokenToBorrowUSD);
    return amountToBorrow;
  }

  /// @dev Function to get loan-to-value ratio of given token's reserve
  /// @param token Address of the token
  /// @return uint256 Loan-to-value ratio
  function _getLTW(address token) private view returns (uint256) {
    DataTypes.ReserveData memory reserve = lendingPool.getReserveData(token);
    uint256 LTV_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF0000;
    uint256 ltw = reserve.configuration.data & ~LTV_MASK;
    return ltw;
  }

  /// @dev Function to get reserve's decimals
  /// @param token Address of the token in reserve
  /// @return uint256 Decimals
  function _getReserveDecimals(address token) private view returns (uint256) {
    DataTypes.ReserveData memory reserve = lendingPool.getReserveData(token);
    uint256 DECIMALS_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00FFFFFFFFFFFF;
    uint256 RESERVE_DECIMALS_START_BIT_POSITION = 48;
    return (reserve.configuration.data & ~DECIMALS_MASK) >> RESERVE_DECIMALS_START_BIT_POSITION;
  }
}
