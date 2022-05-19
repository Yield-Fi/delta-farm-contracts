// SPDX-License-Identifier: Unlicensed

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "../../libs/spookyswap/core/interfaces/IUniswapV2Factory.sol";
import "../../libs/spookyswap/core/interfaces/IUniswapV2Pair.sol";
import "../../libs/spookyswap/core/interfaces/IUniswapV2Router02.sol";
import "../../libs/spookyswap/core/libraries/UniswapV2Library.sol";

import "../../interfaces/IProtocolManager.sol";
import "../../interfaces/IStrategy.sol";
import "../../utils/SafeToken.sol";
import "../../utils/CustomMath.sol";

contract SpookySwapStrategyLiquidate is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IStrategy
{
  using SafeToken for address;
  using SafeMath for uint256;

  IUniswapV2Factory public factory;
  IUniswapV2Router02 public router;
  IProtocolManager public protocolManager;

  /// @dev Create a new liquidate strategy instance.
  /// @param _router The PancakeSwap Router smart contract.
  function initialize(IUniswapV2Router02 _router, IProtocolManager _protocolManager)
    external
    initializer
  {
    __Ownable_init();
    __ReentrancyGuard_init();

    factory = IUniswapV2Factory(_router.factory());
    router = _router;
    protocolManager = _protocolManager;
  }

  /// @dev Execute worker strategy. Take LP token. Return  BaseToken.
  /// @param data Encoded strategy params.
  function execute(bytes calldata data) external override nonReentrant returns (uint256) {
    // 1. Decode strategy params and find lp token.
    (
      address baseToken,
      address token0,
      address token1,
      uint256 baseTokenToGetBack,
      address recipient
    ) = abi.decode(data, (address, address, address, uint256, address));

    IUniswapV2Pair lpToken = IUniswapV2Pair(factory.getPair(token0, token1));
    // 2. Approve router to do their stuffs
    require(
      lpToken.approve(address(router), uint256(-1)),
      "Unable to approve LP token"
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

    // 5. Return all tokens back to the original caller.
    uint256 balance = baseToken.myBalance();
    if (lpToken.balanceOf(address(this)) > 0) {
      lpToken.transfer(msg.sender, lpToken.balanceOf(address(this)));
    }
    SafeToken.safeTransfer(baseToken, recipient, balance);
    // 6. Reset approve for safety reason
    require(
      lpToken.approve(address(router), 0),
      "Unable to reset LP token approval"
    );

    return balance;
  }

  // Swap all tokens to base token using pancakeswap router
  function _convertTokenToBaseToken(address token, address baseToken) internal {
    uint256 amount = token.myBalance();

    token.safeApprove(address(router), uint256(-1));

    address[] memory path = _getBestPath(amount, token, baseToken);
    router.swapExactTokensForTokens(amount, 0, path, address(this), block.timestamp);

    token.safeApprove(address(router), 0);
  }

  /// @dev Function to estimate amount of lp token to remove from pool
  function estimateLpTokenToRemove(
    address baseToken,
    IUniswapV2Pair lpToken,
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
      "Insufficient base token amount"
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
    (uint256 totalToken0, uint256 totalToken1) = UniswapV2Library.getReserves(
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
        _estimateSwapOutput(token1, baseToken, userToken1).add(userToken0);
    }

    if (token1 == baseToken) {
      return
        _estimateSwapOutput(token0, baseToken, userToken0).add(userToken1);
    }

    return
      _estimateSwapOutput(token0, baseToken, userToken0).add(
        _estimateSwapOutput(token1, baseToken, userToken1)
      );
  }

  /// Internal function to estimate swap result on pancakeswap router
  function _estimateSwapOutput(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) internal view returns (uint256) {
    if (amountIn <= 0) {
      return 0;
    }
    // 1. Get the reserves of tokenIn and tokenOut

    address[] memory path = _getBestPath(amountIn, tokenIn, tokenOut);

    // 2. Get amountOut from pancakeswap
    return UniswapV2Library.getAmountsOut(address(factory), amountIn, path)[path.length - 1];
  }

  function _getBestPath(
    uint256 amountIn,
    address token0,
    address token1
  ) internal view returns (address[] memory) {
    address[] memory stables = protocolManager.getStables();

    uint256 l = stables.length;

    address[] memory bestPath = new address[](3);

    (uint256 reserveIn, uint256 reserveOut) = UniswapV2Library.getReserves(
      address(factory),
      token0,
      token1
    );

    uint256 bestAmountOut = UniswapV2Library.getAmountOut(amountIn, reserveIn, reserveOut);
    bestPath[0] = token0;
    bestPath[1] = token1;

    for (uint8 i = 0; i < l; i++) {
      address[] memory path = new address[](3);

      address stable = stables[i];

      if (token0 != stable && token1 != stable && hopsValid(token0, stable, token1)) {
        path[0] = token0;
        path[1] = stable;
        path[2] = token1;

        uint256[] memory tempAmountOut = UniswapV2Library.getAmountsOut(
          address(factory),
          amountIn,
          path
        );

        if (tempAmountOut[2] > bestAmountOut) {
          bestAmountOut = tempAmountOut[2];

          bestPath[0] = token0;
          bestPath[1] = stable;
          bestPath[2] = token1;
        }
      }
    }

    return _trimPath(bestPath);
  }

  function _getBestAmount(address[] memory _path, uint256 amountIn)
    internal
    view
    returns (uint256)
  {
    uint256[] memory amounts = UniswapV2Library.getAmountsOut(address(factory), amountIn, _path);

    return amounts[amounts.length - 1];
  }

  function _trimPath(address[] memory _path) internal pure returns (address[] memory) {
    if (_path[2] == address(0)) {
      address[] memory path = new address[](2);

      path[0] = _path[0];
      path[1] = _path[1];

      return path;
    }

    return _path;
  }

  function hopsValid(
    address token0,
    address stable,
    address token1
  ) internal view returns (bool) {
    bool firstHopValid = factory.getPair(token0, stable) != address(0);
    bool secondHopValid = factory.getPair(stable, token1) != address(0);

    return firstHopValid && secondHopValid;
  }
}
