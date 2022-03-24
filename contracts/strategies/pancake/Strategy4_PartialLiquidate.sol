// SPDX-License-Identifier: Unlicensed

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

import "@openzeppelin/contracts-ethereum-package/contracts/math/Math.sol";

import "../../libs/pancake/interfaces/IPancakeRouterV2.sol";
import "../../interfaces/IStrategy.sol";
import "../../utils/SafeToken.sol";

contract PancakeswapStrategyPartialLiquidate is
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
  function execute(bytes calldata data) external override nonReentrant returns (uint256){
    // 1. Decode strategy params and find lp token.
    (
      address baseToken,
      address token0,
      address token1,
      uint256 howmuch,
      uint256 howmuch_token0,
      uint256 howmuch_token1
    ) = abi.decode(data, (address, address, address, uint256, uint256, uint256));

    IPancakePair lpToken = IPancakePair(factory.getPair(token0, token1));
    // 2. Approve router to do their stuffs

    uint256 lpTokenToLiquidate = Math.min(address(lpToken).myBalance(), howmuch);
    // uint256 lessDebt = Math.min(maxDebtRepayment, howmuch);
    uint256 baseTokenBefore = baseToken.myBalance();

    require(
      lpToken.approve(address(router), uint256(-1)),
      "PancakeswapStrategyLiquidate->execute: unable to approve LP token"
    );

    // 3. Remove all liquidity back to token0 and token1.
    router.removeLiquidity(
      token0,
      token1,
      lpTokenToLiquidate,
      howmuch_token0,
      howmuch_token1,
      address(this),
      block.timestamp
    );

    // 4. Convert tokens to baseToken.
    if (token0 != baseToken) {
      _convertTokenToBaseToken(token0, baseToken, howmuch_token0);
    }

    if (token1 != baseToken) {
      _convertTokenToBaseToken(token1, baseToken, howmuch_token1);
    }

    // baseTokenAfter is balance after conversion of token 0 and 1 to basetoken
    // 5. Return all baseToken back to the original caller.
    uint256 baseTokenAfter = baseToken.myBalance();

    require(
      baseTokenBefore < baseTokenAfter, // checking if after conversions we did get more  baseTokens
      "PancakeswapStrategyLiquidate->execute: conversion of tokens to baseToken not possible"
    );

    require(
      baseTokenAfter >= howmuch, // checking if after conversions we have enough base token
      "PancakeswapStrategyLiquidate->execute: insufficient baseToken received"
    );
    SafeToken.safeTransfer(baseToken, msg.sender, baseTokenAfter);
    // 6. Reset approve for safety reason
    require(
      lpToken.approve(address(router), 0),
      "PancakeswapStrategyLiquidate->execute: unable to reset LP token approval"
    );
    return baseTokenAfter;
  }

  // Swap all tokens to base token using pancakeswap router
  function _convertTokenToBaseToken(
    address token,
    address baseToken,
    uint256 howmuchtoken
  ) internal {
    token.safeApprove(address(router), uint256(-1));

    address[] memory path = new address[](2);
    path[0] = token;
    path[1] = baseToken;
    uint256 howmuchtokenconvert = Math.min(token.myBalance(), howmuchtoken);
    router.swapExactTokensForTokens(howmuchtokenconvert, 0, path, address(this), block.timestamp);

    token.safeApprove(address(router), 0);
  }
}
