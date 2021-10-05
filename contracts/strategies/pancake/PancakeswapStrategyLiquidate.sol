// SPDX-License-Identifier: Unlicensed

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

import "../../libs/pancake/interfaces/IPancakeRouterV2.sol";
import "../../interfaces/IStrategy.sol";
import "../../utils/SafeToken.sol";

contract PancakeswapStrategyLiquidate is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IStrategy
{
  using SafeToken for address;

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
    (address baseToken, address token0, address token1, uint256 minBaseToken) = abi.decode(
      data,
      (address, address, address, uint256)
    );

    IPancakePair lpToken = IPancakePair(factory.getPair(token0, token1));
    // 2. Approve router to do their stuffs

    require(
      lpToken.approve(address(router), uint256(-1)),
      "PancakeswapStrategyLiquidate->execute: unable to approve LP token"
    );

    // 3. Remove all liquidity back to token0 and token1.
    router.removeLiquidity(
      token0,
      token1,
      lpToken.balanceOf(address(this)),
      0,
      0,
      address(this),
      block.timestamp
    );

    // 4. Convert tokens to baseToken.
    if (token0 != baseToken) {
      _convertTokenToBaseToken(token0, baseToken);
    }

    if (token1 != baseToken) {
      _convertTokenToBaseToken(token1, baseToken);
    }

    // 5. Return all baseToken back to the original caller.
    uint256 balance = baseToken.myBalance();
    require(
      balance >= minBaseToken,
      "PancakeswapStrategyLiquidate->execute: insufficient baseToken received"
    );
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
}
