pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import { IProtocolManager } from "./interfaces/IProtocolManager.sol";
import { IWorker } from "./interfaces/IWorker.sol";
import { IVault } from "./interfaces/IVault.sol";

/// @dev Contains information about addresses used within the protocol, acts as semi-central protocol point
contract ProtocolManager is OwnableUpgradeSafe, IProtocolManager {
  /// @dev Contains info about client contract's approvals
  mapping(address => bool) public override approvedClients;
  /// address[] public approvedClientsList;

  /// @dev Vault(s)
  mapping(address => bool) public override approvedVaults;
  /// @dev tokenToVault(s)
  mapping(address => address) public override tokenToVault;
  /// address[] public approvedVaultsList;

  /// @dev Vault config(s)
  mapping(address => bool) public override approvedVaultConfigs;
  /// address[] public approvedVaultConfigsList;

  /// @dev check if address is in BountyCollectors List also provide it status
  mapping(address => bool) public checkIfApprovedBountyCollectors;
  /// address[] public approvedVBountyCollectorsList;
   /// @dev BountyCollectors in form of listing
  address[] public  approvedBountyCollectors;
  /// @dev  Strategies checking if address is on list
  mapping(address => bool) public approvedStrategiesCheck;
  /// address[] public approvedStrategiesList;
    /// @dev  Strategies in form of listing
  address[] public approvedStrategies;
  /// @dev Relayer 
  address public override approvedNativeRelayer;
  /// @dev whitelist operators listing
  address[] public whitelistOperatorsList;
  /// @dev check in Array of valid and registered protocol workers set by whitelisted operators 
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


  
    // Function to count number 
    // of values in a mapping
    function countBounties(
    ) view public returns (uint) {
        return approvedBountyCollectors.length;
    }

  /// @dev Bounty collector getter, maps to internal mapping
  function ListApprovedBountyCollectors() public view returns(address[] memory)
  { 
   return approvedBountyCollectors;   
  }
    /// @dev Bounty collector checking if addres present 
  function checkIfApprovedBountyCollectorsIs(address checker) public view returns(bool )
  {
  return checkIfApprovedBountyCollectors[checker];
  }
  /// @dev Strategy getter, maps to internal mapping
  function ListApprovedStrategies() public view returns (address[] memory){
  /// @dev Strategy list
  return approvedStrategies;
  }

  /// @dev whitelistOperatorsList list
  function  ListwhitelistOperators() public view returns (address[] memory){
  return  whitelistOperatorsList;
  }

  /// @dev whitelistOperators checking if addres present
  function  checkWhitelistOperator(address checker) public view returns(bool )
  {
  return  whitelistedOperators[checker];
  }
        
  /// @dev approvedStrategiesCheckIs checking if addres present
  function approvedStrategiesCheckIs(address checker) public view returns(bool )
  {
  return approvedStrategiesCheck[checker];
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
      whitelistOperatorsList.push(operators[i]);
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
      address vault = vaults[i];

      approvedVaults[vault] = isApproved;

      /// @notice Provide token-to-vault mapping (Vault enabled = map token, Vault disabled = assign zero address)
      tokenToVault[IVault(vault).token()] = isApproved ? vault : address(0);
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

    emit ApproveVaultConfigs(msg.sender, vaultConfigs, isApproved);
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
     approvedBountyCollectors.push(bountyCollectors[i]);
      checkIfApprovedBountyCollectors[bountyCollectors[i]] = isApproved;
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
      approvedStrategies.push(strategies[i]);
     approvedStrategiesCheck[strategies[i]] = isApproved;
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
