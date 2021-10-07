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
  mapping(address => bool) public override protocolWorkers;
  /// address[] public approvedProtocolWorkers

  /// @notice ACL - mapping of valid operators' addresses
  mapping(address => bool) whitelistedOperators;

  /// @dev Events
  event WhitelistOperators(address indexed caller, address[] indexed operators, bool indexed isOk);
  event ToggleWorkers(address indexed caller, address[] indexed workers, bool indexed isEnabled);
  event ApproveClientContract(
    address indexed caller,
    address indexed callEntity,
    bool indexed isApproved
  );
  event ApproveVault(address indexed caller, address indexed callEntity, bool indexed isApproved);
  event ApproveVaultConfig(
    address indexed caller,
    address indexed callEntity,
    bool indexed isApproved
  );
  event ApproveBountyCollector(
    address indexed caller,
    address indexed callEntity,
    bool indexed isApproved
  );
  event UpdateNativeRelayer(address indexed caller, address indexed newAddress);

  //@dev initialize the owner and operators of Protocol
  function initialize(address[] calldata initialOperators) external initializer {
    __Ownable_init();

    _whitelistOperators(initialOperators, true);
  }

  /// @dev Set new client contact as approved
  /// @param clientContract New client contact's address
  /// @param isApproved Client contract approval - true or false
  function approveClientContract(address clientContract, bool isApproved) external onlyOwner {
    approvedClients[clientContract] = isApproved;

    emit ApproveClientContract(msg.sender, clientContract, isApproved);
  }

  /// @notice ACL modifier
  /// @dev Only set operators can call decorated method
  modifier onlyWhitelistedOperators() {
    require(whitelistedOperators[msg.sender], "ProtocolManager: Operator not whitelisted");
    _;
  }

  /// @notice ACL - external method
  /// @notice External-internal methods bridge
  function whitelistOperators(address[] calldata operators, bool isOk) external onlyOwner {
    _whitelistOperators(operators, isOk);
  }

  /// @notice ACL
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

  /// @dev Toggle workers within protocol register
  /// @param workers addresses of target workers
  /// @param isEnabled new workers' state
  function toggleWorkers(address[] calldata workers, bool isEnabled)
    external
    override
    onlyWhitelistedOperators
  {
    uint256 length = workers.length;

    for (uint256 i = 0; i < length; i++) {
      protocolWorkers[workers[i]] = isEnabled;
    }

    emit ToggleWorkers(msg.sender, workers, isEnabled);
  }
}
