// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IStrategy {
  /// @dev Execute worker strategy.
  /// @param data Extra calldata information passed along to this strategy.
  function execute(
    bytes calldata data
  ) external;
}
