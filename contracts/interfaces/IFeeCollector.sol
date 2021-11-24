// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IFeeCollector {
  function setConfig(address feeToken, uint256 feeThreshold) external;

  function collect() external;

  function registerFees(address[] calldata clients, uint256[] calldata fees) external;

  function getFeeToken() external view returns (address);

  function feeToCollect() external view returns (uint256);

  function forceCollect(address[] calldata clients) external payable;
}
