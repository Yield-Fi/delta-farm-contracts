// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IBountyCollector {
  function setConfig(address bountyToken, uint256 bountyThreshold) external;

  /// Whitetlist collectors so they can collect bounties
  function whitelistCollectors(address[] calldata collectors, bool ok) external;

  /// Whitetlist worker so it can register new bounties
  function whitelistWorkers(address[] calldata workers, bool ok) external;

  function collect(address client) external;

  /// @dev Be aware of gas cost!
  function collectAll() external view;

  /// Register bounties
  function registerBounty(address client, uint256 amount) external;
}
