// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IBountyCollector {
  /// @dev Set new bounty collector configuration
  function setConfig(
    address bountyToken,
    uint256 bountyThreshold,
    address protocolManager
  ) external;

  /// @dev Whitelist collectors so they can collect bounties
  function whitelistCollectors(address[] calldata collectors, bool ok) external;

  /// @dev Collect bounty for given client
  function collect(address client) external;

  /// @dev Be aware of gas cost!
  function collectAll() external view;

  /// @dev Register bounties
  function registerBounties(address[] calldata clients, uint256[] calldata amount) external;
}
