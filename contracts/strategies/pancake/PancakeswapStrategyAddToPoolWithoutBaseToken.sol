pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";
import "../../../contracts/libs/pancake/interfaces/IPancakeRouterV2.sol";
import "../../../contracts/libs/pancake/PancakeLibraryV2.sol";

import "../../interfaces/IStrategy.sol";

import "../../utils/SafeToken.sol";
import "../../utils/CustomMath.sol";

contract PancakeswapStrategyAddToPoolWithoutBaseToken is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IAddStrategy
{
  using SafeToken for address;
  using SafeMath for uint256;

  IPancakeFactory public factory;
  IPancakeRouterV2 public router;

  /// @dev Create a new add to pool without base token strategy instance.
  /// @param _router The PancakeSwap Router smart contract.
  function initialize(IPancakeRouterV2 _router) external initializer {
    __Ownable_init();
    __ReentrancyGuard_init();

    factory = IPancakeFactory(_router.factory());
    router = _router;
  }

  /// @dev Execute worker strategy. Take BaseToken. Return LP tokens.
  /// @param data Extra calldata information passed along to this strategy.
  function execute(bytes calldata data) external override nonReentrant {
    // 1. Decode strategy params
    (address baseToken, address token0, address token1, uint256 minLPAmount) = abi.decode(
      data,
      (address, address, address, uint256)
    );

    // 2. Find appropriate lp token
    IPancakePair T0_T1_LP = IPancakePair(factory.getPair(token0, token1));

    // 3. Calculate amount of base token to swap on token 0
    uint256 amountOfBaseTokenToSwapOnToken0 = _calculateAmountOfBaseTokenToSwapOnToken0(
      baseToken,
      token0,
      token1
    );

    // 3. Add liquidity and get amount of new lp tokens
    uint256 amountOfNewLpTokens = _addLiquidity(
      amountOfBaseTokenToSwapOnToken0,
      baseToken,
      token0,
      token1
    );

    require(
      amountOfNewLpTokens >= minLPAmount,
      "PancakeswapStrategyAddToPoolWithoutBaseToken->execute: insufficient LP tokens received"
    );
    require(
      T0_T1_LP.transfer(msg.sender, T0_T1_LP.balanceOf(address(this))),
      "PancakeswapStrategyAddToPoolWithoutBaseToken->execute: failed to transfer LP token"
    );
    // 5. Reset approval for safety reason
    baseToken.safeApprove(address(router), 0);
    token0.safeApprove(address(router), 0);
    token1.safeApprove(address(router), 0);
  }

  function _addLiquidity(
    uint256 baseTokenToSwapOnToken0,
    address baseToken,
    address token0,
    address token1
  ) internal returns (uint256) {
    baseToken.safeApprove(address(router), uint256(-1));

    // 1. Swap baseToken to token0 and token1
    address[] memory baseTokenToToken0Path = new address[](2);
    baseTokenToToken0Path[0] = baseToken;
    baseTokenToToken0Path[1] = token0;
    router.swapExactTokensForTokens(
      baseTokenToSwapOnToken0,
      0,
      baseTokenToToken0Path,
      address(this),
      block.timestamp
    );

    address[] memory baseTokenToToken1Path = new address[](2);
    baseTokenToToken1Path[0] = baseToken;
    baseTokenToToken1Path[1] = token1;
    router.swapExactTokensForTokens(
      baseToken.myBalance(), // Rest of base token
      0,
      baseTokenToToken1Path,
      address(this),
      block.timestamp
    );

    // 2. Add liquidity and return amount of new lp tokens.
    token0.safeApprove(address(router), uint256(-1));
    token1.safeApprove(address(router), uint256(-1));

    (, , uint256 amountOfNewLpTokens) = router.addLiquidity(
      token0,
      token1,
      token0.myBalance(),
      token1.myBalance(),
      0,
      0,
      address(this),
      block.timestamp
    );

    return amountOfNewLpTokens;
  }

  function _calculateAmountOfBaseTokenToSwapOnToken0(
    address baseToken,
    address token0,
    address token1
  ) internal view returns (uint256) {
    // Calculate ratio in which base token will be swapped to token0 and token1
    (uint256 x, uint256 y) = _calculateBaseTokenRatioToSplit(baseToken, token0, token1);

    return baseToken.myBalance().mul(x).div(x.add(y));
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
    view
    override
    returns (
      uint256,
      uint256,
      uint256,
      uint256
    )
  {
    // 1. Calculate amount of base token after split
    (
      uint256 firstPartOfBaseToken,
      uint256 secondPartOfBaseToken
    ) = _calculateAmountsOfBaseTokenAfterSplit(baseToken, token0, token1, amount);

    // 2. Estimate amounts and return it
    return (
      firstPartOfBaseToken,
      secondPartOfBaseToken,
      _getAmountOutHelper(firstPartOfBaseToken, baseToken, token0),
      _getAmountOutHelper(secondPartOfBaseToken, baseToken, token1)
    );
  }

  function _calculateBaseTokenRatioToSplit(
    address baseToken,
    address token0,
    address token1
  ) internal view returns (uint256, uint256) {
    // Get reserves of tokens in given pools needed to the calculations
    // Naming convention: e.g. ResBTOK_bt_t0 - Reserve of base token in the baseToken-token0 pool
    (uint256 ResTOK0_t0_t1, uint256 ResTOK1_t0_t1) = PancakeLibraryV2.getReserves(
      address(factory),
      token0,
      token1
    );

    (uint256 ResBTOK_bt_t0, uint256 ResTOK0_bt_t0) = PancakeLibraryV2.getReserves(
      address(factory),
      baseToken,
      token0
    );

    (uint256 ResBTOK_bt_t1, uint256 ResTOK1_bt_t1) = PancakeLibraryV2.getReserves(
      address(factory),
      baseToken,
      token1
    );

    uint256 x = ResTOK0_t0_t1.mul(ResBTOK_bt_t0).div(ResTOK0_bt_t0);
    uint256 y = ResTOK1_t0_t1.mul(ResBTOK_bt_t1).div(ResTOK1_bt_t1);

    return (x, y);
  }

  function _calculateAmountsOfBaseTokenAfterSplit(
    address baseToken,
    address token0,
    address token1,
    uint256 amount
  ) internal view returns (uint256, uint256) {
    (uint256 x, uint256 y) = _calculateBaseTokenRatioToSplit(baseToken, token0, token1);
    uint256 firstPartOfBaseToken = amount.mul(x).div(x.add(y));
    uint256 secondPartOfBaseToken = amount.sub(firstPartOfBaseToken);

    return (firstPartOfBaseToken, secondPartOfBaseToken);
  }

  function _getAmountOutHelper(
    uint256 amountIn,
    address tokenIn,
    address tokenOut
  ) internal view returns (uint256) {
    (uint256 reserveIn, uint256 reserveOut) = PancakeLibraryV2.getReserves(
      address(factory),
      tokenIn,
      tokenOut
    );

    return PancakeLibraryV2.getAmountOut(amountIn, reserveIn, reserveOut);
  }

  receive() external payable {}
}
