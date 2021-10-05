pragma solidity 0.6.6;

interface IProtocolManager {
  /// @dev Worker getter, maps to internal contract mapping
  function protocolWorkers(address token0, address token1) external returns (address);

  /// @dev Client getter, maps to internal contract mapping
  function approvedClients(address client) external returns (bool);

  /// @dev Manually assign new worker to given token pair
  function addWorker(
    address token0,
    address token1,
    address worker,
    bool overwrite
  ) external;

  /// @dev Automatically assign new worker to token pair resolved from the worker itself
  function addWorker(address worker, bool overwrite) external;

  /// @dev Manually remove new worker from the register using given token pair
  function removeWorker(address token0, address token1) external;

  /// @dev Automatically remove worker from register using given worker address and pair resolved from the worker itself
  function removeWorker(address worker) external;
}
