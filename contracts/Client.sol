pragma solidity 0.6.6;

import { IWorker } from "./interfaces/IWorker.sol";
import { IVault } from "./interfaces/IVault.sol";
import { IWorkerRouter } from "./interfaces/IWorkerRouter.sol";

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

import "./utils/SafeToken.sol";

contract Client is Initializable, OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe {
  /// @dev Libraries
  using SafeMath for uint256;
  using SafeToken for address;

  /// @dev Protocol related general metadata, may be removed in further versions
  string _KIND_;
  string _CLIENT_NAME_;

  /// @dev WorkerRouter responsible for mapping token pairs to proper worker addresses
  IWorkerRouter private _workerRouter;

  /// @dev Whitelist mappings
  mapping(address => bool) whitelistedCallers;
  mapping(address => bool) whitelistedOperators;

  /// @dev Whitelist modifiers - callers
  modifier onlyWhitelistedCallers() {
    require(whitelistedCallers[msg.sender], "ClientContract: Caller not whitelisted.");
    _;
  }

  /// @dev Whitelist modifiers - operators
  modifier onlyWhitelistedOperators() {
    require(whitelistedOperators[msg.sender], "ClientContract: Operator not whitelisted.");
    _;
  }

  /// @dev Whitelist methods - callers
  function whitelistCallers(address[] calldata callers, bool isOk)
    external
    onlyWhitelistedOperators
  {
    for (uint256 i = 0; i < callers.length; i++) {
      whitelistedCallers[callers[i]] = isOk;
    }
  }

  /// @dev Whitelist methods - operators
  function whitelistOperators(address[] calldata operators, bool isOk) external onlyOwner {
    for (uint256 i = 0; i < operators.length; i++) {
      whitelistedOperators[operators[i]] = isOk;
    }
  }

  function initialize(
    string memory kind,
    string memory clientName,
    address workerRouter
  ) public initializer {
    _KIND_ = kind;
    _CLIENT_NAME_ = clientName;
    _workerRouter = IWorkerRouter(workerRouter);

    __Ownable_init();
  }

  /// @notice Deposit function for client's end user. a.k.a protocol entry point
  /// @param recipient Address for which protocol should open new position, reward will be sent there later on
  /// @param token0 Address of token0 pair
  /// @param token1 Address of token1 pair
  /// @param amount Amount of vault operating token (asset) user is willing to enter protocol with.
  /// @dev Vault native token in which assets should have been provided will be resolved on-the-fly using
  /// internal WorkerRouter.
  /// Flow: WorkerRouter.protocolWorkers(token0, token1) returns worker's address (target farming protocol pool)
  /// or address(0) if no proper mapping was found (mapping = worker in this case)
  /// From worker's operating vault we are getting vault native token in which asset should have been provided
  function deposit(
    address recipient,
    address token0,
    address token1,
    uint256 amount
  ) external onlyWhitelistedCallers {
    // Find proper worker
    address designatedWorker = _workerRouter.protocolWorkers(token0, token1);

    // Check for worker existence
    require(designatedWorker != address(0), "ClientContract: Target pool hasn't been found");

    // Cast worker for further methods' usage
    IWorker worker = IWorker(designatedWorker);

    // Cast vault for further method's usage
    IVault vault = IVault(worker.operatingVault());

    // Get native vault token
    address vaultToken = vault.token();

    // Transfer given amount of asset from the caller (Caller must SafeApprove client contract)
    vaultToken.safeTransferFrom(msg.sender, address(this), amount);

    // Approve vault to use given assets
    vaultToken.safeApprove(address(vault), amount);

    // If worker makes usage of vault's operating token, we should covert only one asset to the second, proper one.
    /// @notice Strategy 0: Vault<BUSD> -> Worker<BUSD, USDT> (convert some portion of BUSD to USDT)
    /// @notice Strategy 1: Vault<BUSD> -> Worker<USDC, USDT> (do a split conversion)
    address targetStrategy = worker.token0() == vaultToken || worker.token1() == vaultToken
      ? worker.getStrategies()[0]
      : worker.getStrategies()[1];

    // Enter the protocol using resolved worker strategy
    /// @dev encoded: (address strategy, (address baseToken, address farmingToken, uint256 minLPAmount))
    vault.work(
      0,
      designatedWorker,
      amount,
      recipient,
      abi.encode(targetStrategy, abi.encode(worker.token0(), worker.token1(), 0))
    );

    // Reset approvals
    vaultToken.safeApprove(address(vault), 0);
  }

  function withdraw(
    uint256 pid,
    address recipient,
    address token0,
    address token1
  ) external onlyWhitelistedCallers {
    // Find proper worker
    address designatedWorker = _workerRouter.protocolWorkers(token0, token1);

    // Check for worker existence
    require(designatedWorker != address(0), "ClientContract: Target pool hasn't been found");

    // Cast worker for further methods' usage
    IWorker worker = IWorker(designatedWorker);

    // Cast vault for further method's usage
    IVault vault = IVault(worker.operatingVault());

    // Enter the protocol using resolved worker strategy
    /// @dev encoded: (address strategy, (address baseToken, address farmingToken, uint256 minLPAmount))
    /// worker.getStrategies()[2] = Liquidate
    vault.work(
      pid,
      designatedWorker,
      0,
      recipient,
      abi.encode(worker.getStrategies()[2], abi.encode(worker.token1(), worker.token0(), 0))
    );
  }
}
