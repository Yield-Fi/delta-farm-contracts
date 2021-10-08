pragma solidity 0.6.6;

import { IWorker } from "./interfaces/IWorker.sol";
import { IVault } from "./interfaces/IVault.sol";
import { IProtocolManager } from "./interfaces/IProtocolManager.sol";

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

  /// @dev Events
  event WhitelistOperators(address indexed caller, address[] indexed operators, bool indexed isOk);
  event WhitelistCallers(address indexed caller, address[] indexed callers, bool indexed isOk);
  event Deposit(address indexed recipient, address indexed worker, uint256 indexed amount);
  event SetWorkerFee(address indexed caller, address indexed worker, uint256 indexed feeBps);
  event ToggleWorkers(address indexed caller, address[] indexed workers, bool indexed isEnabled);

  /// @dev Enabled farms
  mapping(address => bool) enabledWorkers;

  /// @dev Protocol related general metadata, may be removed in further versions
  string _KIND_;
  string _CLIENT_NAME_;

  /// @dev ProtocolManager responsible for mapping token pairs to proper worker addresses
  IProtocolManager private _protocolManager;

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

    emit WhitelistCallers(msg.sender, callers, isOk);
  }

  /// @dev Whitelist methods - operators
  function _whitelistOperators(address[] memory operators, bool isOk) internal {
    for (uint256 i = 0; i < operators.length; i++) {
      whitelistedOperators[operators[i]] = isOk;
    }

    emit WhitelistOperators(msg.sender, operators, isOk);
  }

  /// @dev External interface for function above
  function whitelistOperators(address[] calldata operators, bool isOk) external onlyOwner {
    _whitelistOperators(operators, isOk);
  }

  function initialize(
    string calldata kind,
    string calldata clientName,
    address protocolManager,
    address[] calldata initialOperators
  ) external initializer {
    _KIND_ = kind;
    _CLIENT_NAME_ = clientName;

    _protocolManager = IProtocolManager(protocolManager);

    __Ownable_init();

    _whitelistOperators(initialOperators, true);
  }

  /// @notice Deposit function for client's end user. a.k.a protocol entry point
  /// @param recipient Address for which protocol should open new position, reward will be sent there later on
  /// @param worker Address of target worker
  /// @param amount Amount of vault operating token (asset) user is willing to enter protocol with.
  /// @dev Vault native token in which assets should have been provided will be resolved on-the-fly using
  /// internal ProtocolManager.
  function deposit(
    address recipient,
    address worker,
    uint256 amount
  ) external onlyWhitelistedCallers {
    // Cast worker for further methods' usage
    IWorker _worker = IWorker(worker);

    // Check for worker outage due to client-assigned pause
    require(
      enabledWorkers[worker],
      "ClientContract: Target pool hasn't been enabled by the client"
    );

    // Cast vault for further method's usage
    IVault vault = IVault(_worker.operatingVault());

    // Get native vault token
    address vaultToken = vault.token();

    // Transfer given amount of asset from the caller (Caller must SafeApprove client contract)
    vaultToken.safeTransferFrom(msg.sender, address(this), amount);

    // Approve vault to use given assets
    vaultToken.safeApprove(address(vault), amount);

    // If worker makes usage of vault's operating token, we should covert only one asset to the second, proper one.
    /// @notice Strategy 0: Vault<BUSD> -> Worker<BUSD, USDT> (convert some portion of BUSD to USDT)
    /// @notice Strategy 1: Vault<BUSD> -> Worker<USDC, USDT> (do a split conversion)

    bytes memory payload = _worker.token0() == vaultToken || _worker.token1() == vaultToken
      ? abi.encode(_worker.getStrategies()[0], abi.encode(_worker.token0(), _worker.token1(), 0))
      : abi.encode(
        _worker.getStrategies()[1],
        abi.encode(vaultToken, _worker.token0(), _worker.token1(), 0)
      );

    // Enter the protocol using resolved worker strategy
    /// @dev encoded: (address strategy, (address baseToken, address farmingToken, uint256 minLPAmount))
    vault.work(0, worker, amount, recipient, payload);

    // Reset approvals
    vaultToken.safeApprove(address(vault), 0);

    emit Deposit(recipient, worker, amount);
  }

  /// @dev Collect accumulated rewards
  /// @param pid Position ID
  /// @param recipient Position owner
  /// @param rewardTokenOrVaultAddress Information about asset in which reward will be paid out
  function collectReward(
    uint256 pid,
    address recipient,
    address rewardTokenOrVaultAddress
  ) external onlyWhitelistedCallers {
    // Try to resolve Vault address based on given token address
    address vaultAddress = _protocolManager.tokenToVault(rewardTokenOrVaultAddress);

    if (vaultAddress == address(0)) {
      // Vault hasn't been resolved from mapping, try direct look up

      // Did caller provide direct vault address?
      vaultAddress = rewardTokenOrVaultAddress;
    }

    require(
      vaultAddress != address(0),
      "ClientContract: Invalid rewardToken given (no operating Vaults were found)"
    );

    IVault(vaultAddress).collectReward(pid, recipient);
  }

  function withdraw(
    uint256 pid,
    address recipient,
    address worker
  ) external onlyWhitelistedCallers {
    // Cast worker for further methods' usage
    IWorker _worker = IWorker(worker);

    // Cast vault for further method's usage
    IVault vault = IVault(_worker.operatingVault());

    // Enter the protocol using resolved worker strategy
    /// @dev encoded: (address strategy, (address baseToken, address token0, address token1, uint256 minLPAmount))
    /// worker.getStrategies()[2] = Liquidate
    vault.work(
      pid,
      worker,
      0,
      recipient,
      abi.encode(
        _worker.getStrategies()[2],
        abi.encode(_worker.baseToken(), _worker.token1(), _worker.token0(), 0)
      )
    );
  }

  /// @dev Set client-side fee for given worker
  /// @param worker target worker(pool) address
  /// @param feeBps new fee denominator (0 < feeBps < 10000)
  function setWorkerFee(address worker, uint256 feeBps) external onlyWhitelistedOperators {
    require(0 <= feeBps && feeBps < 10000, "ClientContract: Invalid fee amount given");

    IWorker(worker).setClientFee(feeBps);

    emit SetWorkerFee(msg.sender, worker, feeBps);
  }

  /// @dev Enable or disabled given array of workers
  /// @param workers array of workers' addresses to perform action on
  /// @param isEnabled new worker status relative for client end users
  function toggleWorkers(address[] calldata workers, bool isEnabled)
    external
    onlyWhitelistedOperators
  {
    for (uint256 i = 0; i < workers.length; i++) {
      enabledWorkers[workers[i]] = isEnabled;
    }

    emit ToggleWorkers(msg.sender, workers, isEnabled);
  }
}
