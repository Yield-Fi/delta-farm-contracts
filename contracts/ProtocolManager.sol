pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import { IProtocolManager } from "./interfaces/IProtocolManager.sol";
import { IWorker } from "./interfaces/IWorker.sol";

contract ProtocolManager is OwnableUpgradeSafe, IProtocolManager {
  /// @dev Contains info about client contract's approvals
  mapping(address => bool) public override approvedClients;

  /// @dev Array of valid and registered protocol workers set by whitelisted operators
  mapping(address => mapping(address => address)) public override protocolWorkers;

  /// @notice ACL - mapping of valid operators' addresses
  mapping(address => bool) whitelistedOperators;

  function initialize() external initializer {
    __Ownable_init();
  }

  /// @dev Set new client contact as approved
  /// @param clientContract New client contact's address
  /// @param isApprove Client contract approval - true or false
  function approveClientContract(address clientContract, bool isApprove) external onlyOwner {
    approvedClients[clientContract] = isApprove;
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
  }

  /// @dev Add worker to the global register
  /// @dev Method manually assigns given tokens' combination to given worker
  /// @param token0 address of token0
  /// @param token1 address of token1
  /// @param worker address of target worker
  /// @param overwrite should new worker overwrite the old one if it exist?
  /// @notice Function overload
  function addWorker(
    address token0,
    address token1,
    address worker,
    bool overwrite
  ) external override onlyWhitelistedOperators {
    if (!overwrite) ensureSlotUnoccupied(token0, token1);

    protocolWorkers[token0][token1] = worker;
    protocolWorkers[token1][token0] = worker;
  }

  /// @dev Add worker to the global register
  /// @dev Method automatically discovers proper tokens for given worker
  /// @param worker address of target worker
  /// @param overwrite should new worker overwrite the old one if it exist?
  /// @notice Fails and reverts on bad call
  /// @notice Function overload
  function addWorker(address worker, bool overwrite) external override onlyWhitelistedOperators {
    IWorker _worker = IWorker(worker);

    (address token0, address token1) = (_worker.token0(), _worker.token1());

    if (!overwrite) ensureSlotUnoccupied(token0, token1);

    protocolWorkers[token0][token1] = worker;
    protocolWorkers[token1][token0] = worker;
  }

  /// @dev Remove worker mapping from protocol register
  /// @dev Method manually cleans up given tokens' combination setting addresses to address(0)
  /// @param token0 address of token0
  /// @param token1 address of token1
  /// @notice Function overload
  function removeWorker(address token0, address token1) external override onlyWhitelistedOperators {
    protocolWorkers[token0][token1] = address(0);
    protocolWorkers[token1][token0] = address(0);
  }

  /// @dev Remove worker mapping from protocol register
  /// @dev Method automatically discovers proper tokens for given worker
  /// @param worker address of target worker
  /// @notice Fails and reverts on bad call
  /// @notice Function overload
  function removeWorker(address worker) external override onlyWhitelistedOperators {
    IWorker _worker = IWorker(worker);

    (address token0, address token1) = (_worker.token0(), _worker.token1());

    protocolWorkers[token0][token1] = address(0);
    protocolWorkers[token1][token0] = address(0);
  }

  /// @dev Failsafe method - checks if given combination (slot) is already occupied
  /// @param token0 token address
  /// @param token1 token address
  /// @notice Fails and reverts if given position is occupied
  function ensureSlotUnoccupied(address token0, address token1) internal view {
    require(
      protocolWorkers[token0][token1] == address(0) &&
        protocolWorkers[token1][token0] == address(0),
      "ProtocolManager: Slot already occupied, set 'overwrite' flag to 'true' to overwrite current mapping"
    );
  }
}
