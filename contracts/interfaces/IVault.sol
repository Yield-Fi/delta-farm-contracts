// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IVault {
  /// @dev Return the total ERC20 entitled to the token holders. Be careful of unaccrued interests.
  function totalToken() external view returns (uint256);

  /// @dev Request funds from user through Vault
  function requestFunds(address targetedToken, uint256 amount) external;

  function token() external view returns (address);

  /// Register rewards for positions for the worker
  function registerRewards(uint256[] calldata pids, uint256[] calldata amounts) external;

  /// Send the rewards to position owner
  function collectReward(uint256 pid) external;

  /// @dev Protocol entry point
  function work(
    uint256 id,
    address worker,
    uint256 amount,
    address endUser,
    bytes calldata data
  ) external payable;
}
