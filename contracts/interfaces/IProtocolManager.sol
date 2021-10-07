pragma solidity 0.6.6;

interface IProtocolManager {
  /// @dev Worker getter, maps to internal mapping
  function protocolWorkers(address worker) external returns (bool);

  /// @dev Vault getter, maps to internal mapping
  function approvedVaults(address vault) external returns (bool);

  /// @dev Vault config getter, maps to internal mapping
  function approvedVaultConfigs(address vaultConfig) external returns (bool);

  /// @dev Bounty collector getter, maps to internal mapping
  function approvedBountyCollectors(address bountyCollector) external returns (bool);

  /// @dev Strategy getter, maps to internal mapping
  function approvedStrategies(address strategy) external returns (bool);

  /// @dev Native relayer getter, maps to internal contract mapping
  function approvedNativeRelayer() external returns (address);

  /// @dev Client getter, maps to internal mapping
  function approvedClients(address client) external returns (bool);

  /// @dev Protocol ACL
  function approveWorkers(address[] calldata workers, bool isEnabled) external;

  /// @dev Protocol ACL
  function approveClients(address[] calldata workers, bool isEnabled) external;

  /// @dev Protocol ACL
  function approveVaults(address[] calldata workers, bool isEnabled) external;

  /// @dev Protocol ACL
  function approveVaultConfigs(address[] calldata workers, bool isEnabled) external;

  /// @dev Protocol ACL
  function approveBountyCollectors(address[] calldata workers, bool isEnabled) external;

  /// @dev Protocol ACL
  function approveStrategies(address[] calldata workers, bool isEnabled) external;

  /// @dev Protocol Info
  function setNativeRelayer(address nativeRelayer) external;
}
