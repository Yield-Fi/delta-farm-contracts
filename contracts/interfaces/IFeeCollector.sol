// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IFeeCollector {
  function setConfig(address feeToken, uint256 feeThreshold) external;

  function collect() external;

  /// Register fees
  function registerFees(address[] calldata clients, uint256[] calldata fees) external;
}
