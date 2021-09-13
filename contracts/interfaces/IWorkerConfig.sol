// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.3;

interface IWorkerConfig {
  /// @dev Return the work factor for the worker, using 1e4 as denom.
  function workFactor(address worker) external view returns (uint256);

  /// @dev Return the kill factor for the worker, using 1e4 as denom.
  function killFactor(address worker) external view returns (uint256);

  /// @dev Return the kill factor for the worker without checking isStable, using 1e4 as denom.
  function rawKillFactor(address worker) external view returns (uint256);

  /// @dev Return if worker is stable.
  function isStable(address worker) external view returns (bool);

  /// @dev Revert if liquidity pool under manipulation
  function isReserveConsistent(address worker) external view returns (bool);
}
