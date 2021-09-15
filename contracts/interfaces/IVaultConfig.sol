// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IVaultConfig {
  /// @dev Return the address of wrapped native token.
  function nativeTokenAddr() external view returns (address);

  /// @dev Return the address of wNative relayer.
  function wNativeRelayer() external view returns (address);

  /// @dev Return if the caller is whitelisted.
  function whitelistedCallers(address caller) external returns (bool);

  /// @dev Return if the caller is whitelisted.
  function whitelistedLiquidators(address caller) external returns (bool);

  /// @dev Return if the given strategy is approved.
  function approvedAddStrategies(address addStrats) external returns (bool);

  /// @dev Return whether the given address is a worker.
  function isWorker(address worker) external view returns (bool);

  /// @dev Return the address of treasury account
  function getTreasuryAddr() external view returns (address);

  /// @dev Return if worker is stable
  function isWorkerStable(address worker) external view returns (bool);

  /// @dev Return if reserve that worker is working with is consistent
  function isWorkerReserveConsistent(address worker) external view returns (bool);
}
