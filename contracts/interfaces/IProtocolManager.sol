pragma solidity 0.6.6;

interface IProtocolManager {
  /// @dev Worker getter, maps to internal mapping
  function approvedWorkers(address worker) external returns (bool);

  /// @dev Vault getter, maps to internal mapping
  function approvedVaults(address vault) external returns (bool);

  /// @dev Operator getter, maps to internal mapping
  function whitelistedOperators(address operator) external returns (bool);

  /// @dev Token to vault mapping
  function tokenToVault(address token) external returns (address);

  /// @dev Vault config getter, maps to internal mapping
  function approvedVaultConfigs(address vaultConfig) external returns (bool);

  /// @dev Bounty collector getter, maps to internal mapping
  function checkIfApprovedBountyCollectors(address bountyCollector) external returns (bool);

  /// @dev Strategy getter, maps to internal mapping
  function approvedStrategiesCheck(address strategy) external returns (bool);

  /// @dev Native relayer getter, maps to internal contract mapping
  function approvedNativeRelayer() external returns (address);

  /// @dev Client getter, maps to internal mapping
  function approvedClients(address client) external returns (bool);

  /// @dev Protocol ACL
  function approveWorkers(address[] calldata workers, bool isApproved) external;

  /// @dev Protocol ACL
  function approveClients(address[] calldata clients, bool isApproved) external;

  /// @dev Protocol ACL
  function approveVaults(address[] calldata vaults, bool isApproved) external;

  /// @dev Protocol ACL
  function approveVaultConfigs(address[] calldata vaultConfigs, bool isApproved) external;

  /// @dev Protocol ACL
  function approveBountyCollectors(address[] calldata bountyCollectors, bool isApproved) external;

  /// @dev Protocol ACL
  function approveStrategies(address[] calldata strategies, bool isEnabled) external;

  /// @dev Protocol Info
  function setNativeRelayer(address nativeRelayer) external;

  function approveAdminContract(address _adminContract) external;

  function isAdminContract(address account) external view returns (bool);

  function approvedHarvesters(address _harvester) external returns (bool);

  function approveHarvesters(address[] calldata harvesters, bool isApprove) external;
}
