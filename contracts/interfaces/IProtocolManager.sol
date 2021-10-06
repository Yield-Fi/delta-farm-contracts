pragma solidity 0.6.6;

interface IProtocolManager {
  /// @dev Worker getter, maps to internal contract mapping
  function protocolWorkers(address worker) external returns (bool);

  /// @dev Client getter, maps to internal contract mapping
  function approvedClients(address client) external returns (bool);

  /// @dev Automatically assign new worker to token pair resolved from the worker itself
  function toggleWorkers(address[] calldata workers, bool isOk) external;
}
