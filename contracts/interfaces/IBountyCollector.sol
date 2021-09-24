// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IBountyCollector {
  function setConfig(address bountyToken, uint256 bountyThreshold) external;

  /// Whitetlist collectors so they can collect bounties
  function whitelistCollectors(address[] calldata collectors, bool ok) external;

  /// Whitetlist vault so it can register new bounties
  function whitelistVaults(address[] calldata vaults, bool ok) external;

  function collect(address client) external;

  /// @dev Be aware of gas cost!
  function collectAll() external view;

  /// Register bounties
  function registerBounties(address[] calldata clients, uint256[] calldata amount) external;
}
