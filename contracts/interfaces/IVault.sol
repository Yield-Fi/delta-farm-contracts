// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IVault {
  /// @notice Functions' declarations for mappings and properties
  /// @dev (Mapping) Rewards ACL - function-to-mapping
  function approvedRewardAssigners(address assigner) external returns (bool);

  /// @dev (Property) Get vault's base token
  function token() external view returns (address);

  /// @dev (Mapping) Position ID => Native Token Amount
  function rewards(uint256 pid) external view returns (uint256);

  /// @notice True functions
  /// @dev Return the total ERC20 entitled to the token holders. Be careful of unaccrued interests.
  function totalToken() external view returns (uint256);

  /// @dev Request funds from user through Vault
  function requestFunds(address targetedToken, uint256 amount) external;

  /// Register rewards for positions for the worker
  function registerRewards(uint256[] calldata pids, uint256[] calldata amounts) external;

  /// Send the rewards to position owner
  function collectReward(uint256 pid, address recipient) external;

  /// @dev Rewards ACL
  function approveRewardAssigners(address[] calldata rewardAssigners, bool isApproved) external;

  /// @dev Protocol entry point
  function work(
    uint256 id,
    address worker,
    uint256 amount,
    address recipient,
    bytes calldata data
  ) external payable;
}
