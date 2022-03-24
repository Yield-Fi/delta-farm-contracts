// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IStrategy {
  /// @dev Execute worker strategy.
  /// @param data Extra calldata information passed along to this strategy.
  function execute(bytes calldata data) external returns(uint256);
}

interface IAddStrategy is IStrategy {
  function estimateAmounts(
    address baseToken,
    address token0,
    address token1,
    uint256 amount
  )
    external
    returns (
      uint256,
      uint256,
      uint256,
      uint256
    );
}
