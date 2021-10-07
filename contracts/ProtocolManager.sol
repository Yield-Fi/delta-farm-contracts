pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import { IProtocolManager } from "./interfaces/IProtocolManager.sol";
import { IWorker } from "./interfaces/IWorker.sol";
//@dev Contains information about addresses used in application, help manage operators and owner
contract ProtocolManager is OwnableUpgradeSafe, IProtocolManager {
  /// @dev Contains info about client contract's approvals
  mapping(address => bool) public override approvedClients;
 
  /// @dev Vault - show where is the Valult 
 mapping(address => bool) public override whereIsVault;
   /// @dev  Vault Config - show where is the  Vault Config 
 mapping(address => bool) public override whereIsVaultConfig;
   /// @dev  BountyCollector - show where is the  BountyCollector 
 mapping(address => bool) public override BountyCollectorAdr;

   /// @dev  Strategies  - show where are  Strategies 
 mapping(address => bool) public override StrategiesAdr; // raczej podwójny mapping jeszcze na typ strategiii

/// @dev Relayer
 mapping(address => bool) public override NativeRelayerAdr; 
  /// @dev Array of valid and registered protocol workers set by whitelisted operators
  mapping(address => bool) public override protocolWorkers;

  /// @notice ACL - mapping of valid operators' addresses
  mapping(address => bool) whitelistedOperators;

  /// @dev Events
  event WhitelistOperators(address indexed caller, address[] indexed operators, bool indexed isOk);
  event ToggleWorkers(address indexed caller, address[] indexed workers, bool indexed isEnabled);
  event ApproveClientContract(
    address indexed caller,
    address indexed client,
    bool indexed isApproved
  );
//@dev initialize the owner and operators of Protocol
  function initialize() external initializer {
    __Ownable_init();
    // czy tu nie powinno być coś o operatorach , czy w Panelu admina dla Y.F. jest opcja zmiany operatorów ?
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

  /// @notice ACL
  /// @dev Enable/Disable given array of operators making them
  /// able or unable to perform restricted set of actions
  /// @param operators Array of operators' public addresses to enable/disable
  /// @param isOk Are operators going to be enabled or disabled?
  function whitelistOperators(address[] calldata operators, bool isOk) external onlyOwner {
    uint256 length = operators.length;

    for (uint256 i = 0; i < length; i++) {
      whitelistedOperators[operators[i]] = isOk;
    }

    emit WhitelistOperators(msg.sender, operators, isOk);
  }



  /// @dev Toggle workers within protocol registerer
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


// showMe functions :
// operators - public addresses of key pairs
function getListOfAllOperators public view{} // returns all

function getListOfActivOperators public view{} // returns where 1

function getListOfBannedOperators public view{} // returns where 0
// contract addresses on blockchain

function VaultAddress public view{} // returns all

function VaultConfigAddress public view{} // returns all

function BountyCollector public view{} // returns all


// update functions 
function updateVaultConfigAddress public view onlyowner{} // writes address // pytanie czy zostawiać stare //adresy bo migracje itp taki backtrack by sie przydał, a wtedy view by wskazywało na ostatni albo listowało całość jak jest lista a nie pointer ... 
