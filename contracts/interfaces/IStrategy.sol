// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.3;

interface IStrategy {
  /// @dev Execute worker strategy.
  /// @param data Extra calldata information passed along to this strategy.
  function execute(
    bytes calldata data
  ) external;
}
