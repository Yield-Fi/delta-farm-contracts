pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import { IProtocolManager } from "./interfaces/IProtocolManager.sol";
import { IWorker } from "./interfaces/IWorker.sol";

/// @dev Contains information about addresses used within the protocol, acts as semi-central protocol point
contract ProtocolManager is OwnableUpgradeSafe, IProtocolManager {
  /// @dev Contains info about client contract's approvals
  mapping(address => bool) public override approvedClients;
  /// address[] public approvedClientsList;

  /// @dev Vault(s)
  mapping(address => bool) public override approvedVaults;
  /// address[] public approvedVaultsList;

  /// @dev Vault config(s)
  mapping(address => bool) public override approvedVaultConfigs;
  /// address[] public approvedVaultConfigsList;

  /// @dev BountyCollectors
  mapping(address => bool) public override approvedBountyCollectors;
  /// address[] public approvedVBountyCollectorsList;

  /// @dev  Strategies
  mapping(address => bool) public override approvedStrategies;
  /// address[] public approvedStrategiesList;

  /// @dev Relayer
  address public override approvedNativeRelayer;

  /// @dev Array of valid and registered protocol workers set by whitelisted operators
  mapping(address => bool) public override approvedWorkers;
  /// address[] public approvedProtocolWorkers

  /// @notice ACL - mapping of valid operators' addresses
  mapping(address => bool) whitelistedOperators;

  /// @dev Events
  event WhitelistOperators(address indexed caller, address[] indexed operators, bool indexed isOk);
  event ApproveWorkers(address indexed caller, address[] indexed workers, bool indexed isEnabled);
  event ApproveClients(address indexed caller, address[] indexed entities, bool indexed isApproved);
  event ApproveVaults(address indexed caller, address[] indexed entities, bool indexed isApproved);
  event ApproveStrategies(
    address indexed caller,
    address[] indexed entities,
    bool indexed isApproved
  );
  event ApproveVaultConfigs(
    address indexed caller,
    address[] indexed entities,
    bool indexed isApproved
  );
  event ApproveBountyCollectors(
    address indexed caller,
    address[] indexed entities,
    bool indexed isApproved
  );
  event SetNativeRelayer(
    address indexed caller,
    address indexed oldAddress,
    address indexed newAddress
  );

  /// @dev initialize the owner and operators of Protocol
  function initialize(address[] calldata initialOperators) external initializer {
    __Ownable_init();
    _whitelistOperators(initialOperators, true);
  }

  /// @notice Internal ACL modifier
  /// @dev Only set operators can call decorated method
  modifier onlyWhitelistedOperators() {
    require(whitelistedOperators[msg.sender], "ProtocolManager: Operator not whitelisted");
    _;
  }

  /// @notice Internal ACL - external method
  /// @notice External-internal methods bridge
  /// @param operators Array of operators' public addresses to enable/disable
  /// @param isOk Are operators going to be enabled or disabled?
  function whitelistOperators(address[] calldata operators, bool isOk) external onlyOwner {
    _whitelistOperators(operators, isOk);
  }

  /// @notice Internal ACL
  /// @dev Enable/Disable given array of operators making them
  /// able or unable to perform restricted set of actions
  /// @param operators Array of operators' public addresses to enable/disable
  /// @param isOk Are operators going to be enabled or disabled?
  function _whitelistOperators(address[] memory operators, bool isOk) internal {
    uint256 length = operators.length;

    for (uint256 i = 0; i < length; i++) {
      whitelistedOperators[operators[i]] = isOk;
    }

    emit WhitelistOperators(msg.sender, operators, isOk);
  }

  /// @dev Protocol ACL
  /// @param workers array of addresses
  /// @param isEnabled true | false
  function approveWorkers(address[] calldata workers, bool isEnabled)
    external
    override
    onlyWhitelistedOperators
  {
    uint256 length = workers.length;

    for (uint256 i = 0; i < length; i++) {
      approvedWorkers[workers[i]] = isEnabled;
    }

    emit ApproveWorkers(msg.sender, workers, isEnabled);
  }

  /// @dev Protocol ACL
  /// @param clients array of addresses
  /// @param isApproved true | false
  function approveClients(address[] calldata clients, bool isApproved)
    external
    override
    onlyWhitelistedOperators
  {
    uint256 length = clients.length;

    for (uint256 i = 0; i < length; i++) {
      approvedClients[clients[i]] = isApproved;
    }

    emit ApproveClients(msg.sender, clients, isApproved);
  }

  /// @dev Protocol ACL
  /// @param vaults array of addresses
  /// @param isApproved true | false
  function approveVaults(address[] calldata vaults, bool isApproved)
    external
    override
    onlyWhitelistedOperators
  {
    uint256 length = vaults.length;

    for (uint256 i = 0; i < length; i++) {
      approvedVaults[vaults[i]] = isApproved;
    }

    emit ApproveVaults(msg.sender, vaults, isApproved);
  }

  /// @dev Protocol ACL
  /// @param vaultConfigs array of addresses
  /// @param isApproved true | false
  function approveVaultConfigs(address[] calldata vaultConfigs, bool isApproved)
    external
    override
    onlyWhitelistedOperators
  {
    uint256 length = vaultConfigs.length;

    for (uint256 i = 0; i < length; i++) {
      approvedVaultConfigs[vaultConfigs[i]] = isApproved;
    }

    emit ApproveVaults(msg.sender, vaultConfigs, isApproved);
  }

  /// @dev Protocol ACL
  /// @param bountyCollectors array of addresses
  /// @param isApproved true | false
  function approveBountyCollectors(address[] calldata bountyCollectors, bool isApproved)
    external
    override
    onlyWhitelistedOperators
  {
    uint256 length = bountyCollectors.length;

    for (uint256 i = 0; i < length; i++) {
      approvedBountyCollectors[bountyCollectors[i]] = isApproved;
    }

    emit ApproveBountyCollectors(msg.sender, bountyCollectors, isApproved);
  }

  /// @dev Protocol ACL
  /// @param strategies array of addresses
  /// @param isApproved true | false
  function approveStrategies(address[] calldata strategies, bool isApproved)
    external
    override
    onlyWhitelistedOperators
  {
    uint256 length = strategies.length;

    for (uint256 i = 0; i < length; i++) {
      approvedStrategies[strategies[i]] = isApproved;
    }

    emit ApproveStrategies(msg.sender, strategies, isApproved);
  }

  /// @dev Protocol Information
  /// @param nativeRelayer addresses
  function setNativeRelayer(address nativeRelayer) external override onlyWhitelistedOperators {
    address old = approvedNativeRelayer;

    approvedNativeRelayer = nativeRelayer;

    emit SetNativeRelayer(msg.sender, old, nativeRelayer);
  }
}
