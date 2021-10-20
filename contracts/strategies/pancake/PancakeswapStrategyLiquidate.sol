// SPDX-License-Identifier: Unlicensed

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

import "../../libs/pancake/interfaces/IPancakeRouterV2.sol";
import "../../../contracts/libs/pancake/PancakeLibraryV2.sol";
import "../../interfaces/IStrategy.sol";
import "../../utils/SafeToken.sol";
import "../../utils/CustomMath.sol";

contract PancakeswapStrategyLiquidate is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IStrategy
{
  using SafeToken for address;
  using SafeMath for uint256;

  IPancakeFactory public factory;
  IPancakeRouterV2 public router;

  /// @dev Create a new liquidate strategy instance.
  /// @param _router The PancakeSwap Router smart contract.
  function initialize(IPancakeRouterV2 _router) external initializer {
    __Ownable_init();
    __ReentrancyGuard_init();

    factory = IPancakeFactory(_router.factory());
    router = _router;
  }

  /// @dev Execute worker strategy. Take LP token. Return  BaseToken.
  /// @param data Encoded strategy params.
  function execute(bytes calldata data) external override nonReentrant {
    // 1. Decode strategy params and find lp token.
    (address baseToken, address token0, address token1, uint256 baseTokenToGetBack) = abi.decode(
      data,
      (address, address, address, uint256)
    );

    IPancakePair lpToken = IPancakePair(factory.getPair(token0, token1));
    // 2. Approve router to do their stuffs

    require(
      lpToken.approve(address(router), uint256(-1)),
      "PancakeswapStrategyLiquidate->execute: unable to approve LP token"
    );

    uint256 lpTokenToRemove = baseTokenToGetBack == 0
      ? lpToken.balanceOf(address(this))
      : estimateLpTokenToRemove(baseToken, lpToken, baseTokenToGetBack);

    // 3. Remove all liquidity back to token0 and token1.
    router.removeLiquidity(token0, token1, lpTokenToRemove, 0, 0, address(this), block.timestamp);

    // 4. Convert tokens to baseToken.
    if (token0 != baseToken) {
      _convertTokenToBaseToken(token0, baseToken);
    }

    if (token1 != baseToken) {
      _convertTokenToBaseToken(token1, baseToken);
    }

    // 5. Return all baseToken back to the original caller.
    uint256 balance = baseToken.myBalance();
    SafeToken.safeTransfer(baseToken, msg.sender, balance);
    // 6. Reset approve for safety reason
    require(
      lpToken.approve(address(router), 0),
      "PancakeswapStrategyLiquidate->execute: unable to reset LP token approval"
    );
  }

  // Swap all tokens to base token using pancakeswap router
  function _convertTokenToBaseToken(address token, address baseToken) internal {
    token.safeApprove(address(router), uint256(-1));

    address[] memory path = new address[](2);
    path[0] = token;
    path[1] = baseToken;
    router.swapExactTokensForTokens(token.myBalance(), 0, path, address(this), block.timestamp);

    token.safeApprove(address(router), 0);
  }

  /// @dev Function to estimate amount of lp token to remove from pool
  function estimateLpTokenToRemove(
    address baseToken,
    IPancakePair lpToken,
    uint256 baseTokenToGetBack
  ) internal view returns (uint256) {
    // 1. Get the position's LP balance and LP total supply.
    (uint256 lpBalance, uint256 lpSupply) = (
      lpToken.balanceOf(address(this)),
      lpToken.totalSupply()
    );

    uint256 baseTokenToReceiveFromPool = baseTokensToReceive(
      baseToken,
      lpToken.token0(),
      lpToken.token1(),
      lpBalance,
      lpSupply
    );

    require(
      baseTokenToReceiveFromPool >= baseTokenToGetBack,
      "PancakeswapStrategyLiquidate: Insufficient base token amount"
    );

    return lpBalance.mul(baseTokenToGetBack).div(baseTokenToReceiveFromPool);
  }

  function baseTokensToReceive(
    address baseToken,
    address token0,
    address token1,
    uint256 lpBalance,
    uint256 lpSupply
  ) internal view returns (uint256) {
    // 1. Get the reserves of token0 and token1 in the pool
    (uint256 totalToken0, uint256 totalToken1) = PancakeLibraryV2.getReserves(
      address(factory),
      token0,
      token1
    );
    // 2. Convert the position's LP tokens to the underlying assets.
    uint256 userToken0 = lpBalance.mul(totalToken0).div(lpSupply);
    uint256 userToken1 = lpBalance.mul(totalToken1).div(lpSupply);
    // 3. Estimate and return amount of base token to receive
    if (token0 == baseToken) {
      return
        _estimateSwapOutput(token1, baseToken, userToken1, userToken1, userToken0).add(userToken0);
    }

    if (token1 == baseToken) {
      return
        _estimateSwapOutput(token0, baseToken, userToken0, userToken0, userToken1).add(userToken1);
    }

    return
      _estimateSwapOutput(token0, baseToken, userToken0, userToken0, 0).add(
        _estimateSwapOutput(token1, baseToken, userToken1, userToken1, 0)
      );
  }

  /// Internal function to estimate swap result on pancakeswap router
  function _estimateSwapOutput(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 reserveInToSubtract,
    uint256 reserveOutToSubtract
  ) internal view returns (uint256) {
    if (amountIn <= 0) {
      return 0;
    }
    // 1. Get the reserves of tokenIn and tokenOut
    IPancakePair Tin_Tout_LP = IPancakePair(factory.getPair(tokenIn, tokenOut));
    (uint256 r0, uint256 r1, ) = Tin_Tout_LP.getReserves();
    (uint256 totalTokenIn, uint256 totalTokenOut) = Tin_Tout_LP.token0() == tokenIn
      ? (r0, r1)
      : (r1, r0);

    // 2. Get amountOut from pancakeswap
    return
      PancakeLibraryV2.getAmountOut(
        amountIn,
        totalTokenIn.sub(reserveInToSubtract),
        totalTokenOut.sub(reserveOutToSubtract)
      );
  }
}
