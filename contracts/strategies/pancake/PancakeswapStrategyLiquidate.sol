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

contract PancakeswapStrategyLiquidate is Initializable, OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe, IStrategy {
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
  /// @param data Extra calldata information passed along to this strategy.
  function execute(bytes calldata data) external override nonReentrant {
    // 1. Find out what farming token we are dealing with.
    (address baseToken, address farmingToken, uint256 minBaseToken) = abi.decode(data, (address, address, uint256));
    IPancakePair lpToken = IPancakePair(factory.getPair(farmingToken, baseToken));
    // 2. Approve router to do their stuffs
    require(
      lpToken.approve(address(router), uint256(-1)),
      "PancakeswapV2StrategyLiquidate::execute:: unable to approve LP token"
    );
    farmingToken.safeApprove(address(router), uint256(-1));
    // 3. Remove all liquidity back to BaseToken and farming tokens.
    router.removeLiquidity(
      baseToken,
      farmingToken,
      lpToken.balanceOf(address(this)),
      0,
      0,
      address(this),
      block.timestamp
    );
    // 4. Convert farming tokens to baseToken.
    address[] memory path = new address[](2);
    path[0] = farmingToken;
    path[1] = baseToken;
    router.swapExactTokensForTokens(farmingToken.myBalance(), 0, path, address(this), block.timestamp);
    // 5. Return all baseToken back to the original caller.
    uint256 balance = baseToken.myBalance();
    require(balance >= minBaseToken, "PancakeswapV2StrategyLiquidate::execute:: insufficient baseToken received");
    SafeToken.safeTransfer(baseToken, msg.sender, balance);
    // 6. Reset approve for safety reason
    require(
      lpToken.approve(address(router), 0),
      "PancakeswapV2StrategyLiquidate::execute:: unable to reset LP token approval"
    );
    farmingToken.safeApprove(address(router), 0);
  }
}
