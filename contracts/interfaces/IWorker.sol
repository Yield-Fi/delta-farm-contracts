// SPDX-License-Identifier: MIT

pragma solidity 0.6.6;

import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

interface IWorker {
  /// @dev Work on a (potentially new) position. Optionally send token back to Vault.
  function work(uint256 positionId, bytes calldata data) external;

  /// @dev Harvest reward tokens, swap them on base token and send to the Vault.
  function harvestRewards() external;

  /// @dev Return the amount of base token to get back if we are to liquidate the position.
  function tokensToReceive(uint256 id) external view returns (uint256);

  /// @dev Set addresses of the supported strategies
  function setStrategies(address[] calldata supportedStrategies) external;

  /// @dev Get addresses of the supported strategies
  function getStrategies() external view returns (address[] memory);

  /// @dev LP token holds by worker
  function lpToken() external view returns (IPancakePair);

  /// @dev Token that is swapped for tokens from pool
  function baseToken() external view returns (address);

  /// @dev Token 0 from the pool that worker is working on
  function token0() external view returns (address);

  /// @dev Token 1 from the pool that worker is working on
  function token1() external view returns (address);

  /// @dev Treasury fee in BPS
  function treasuryFeeBps() external view returns (uint256);

  /// @dev Get fee in bps for given client
  function getClientFee(address clientAccount) external view returns (uint256);

  /// @dev Set fee in bps for specific client
  function setClientFee(uint256 clientFeeBps) external;

  /// @dev Get operating vault address.
  function operatingVault() external view returns (address);

  function setTreasuryFee(uint256 fee) external;

  /// @dev Returns worker's name
  /// @return string worker's name
  function getName() external view returns (string memory);

  function toggleWorker(bool _isEnable) external;

  function isWorkerEnabled() external view returns (bool);

  function getRewardToken() external view returns (address);

  /// @dev Forces worker to harvest rewards immediately without payout checks.
  /// @notice Emergency function
  function forceHarvest() external;

  /// @dev Forces worker to withdraw given position
  /// @notice Emergency function
  function emergencyWithdraw(uint256 positionId, address positionOwner) external;
}
