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

  function initialize(
    string memory kind,
    string memory clientName,
    address workerRouter
  ) public initializer {
    _KIND_ = kind;
    _CLIENT_NAME_ = clientName;
    _workerRouter = IWorkerRouter(workerRouter);
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
  ) external {
    // Find proper worker
    address designatedWorker = _workerRouter.protocolWorkers(token0, token1);

    // Check for worker existence
    require(designatedWorker != address(0), "ClientContract: Target pool hasn't been found");

    // Cast worker for further methods' usage
    IWorker worker = IWorker(designatedWorker);

    // Cast vault for further method's usage
    IVault vault = IVault(worker.getOperatingVault());

    // Get native vault token
    address vaultToken = vault.token();

    // Approve vault to use given assets
    vaultToken.safeApprove(address(vault), amount);

    // Enter the protocol using resolved worker strategy
    /// @dev encoded: (address strategy, (address baseToken, address farmingToken, uint256 minLPAmount))
    vault.work(
      0,
      designatedWorker,
      amount,
      recipient,
      abi.encode(
        worker.criticalAddBaseTokenOnlyStrategy(),
        abi.encode(worker.token1(), worker.token0(), 0)
      )
    );
  }

  function withdraw(
    address endUser,
    address worker,
    uint256 amount
  ) external {}
}
