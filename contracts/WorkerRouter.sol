pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import { IWorkerRouter } from "./interfaces/IWorkerRouter.sol";
import { IWorker } from "./interfaces/IWorker.sol";

/**
 *   @dev Populate reversed mapping
 *   protocolWorkers[token0][token1] = worker;
 *   protocolWorkers[token1][token0] = worker;
 *
 *   @notice to clarify:
 *   protocolWorkers[address USDT][address BUSD] = protocolWorkers[address BUSD][address USDT]
 */
contract WorkerRouter is Initializable, OwnableUpgradeSafe, IWorkerRouter {
  mapping(address => mapping(address => address)) public override protocolWorkers;

  mapping(address => bool) whitelistedOperators;

  modifier onlyWhitelistedOperators() {
    require(whitelistedOperators[msg.sender], "WorkerRouter: Operator not whitelisted");
    _;
  }

  function initialize() public initializer {
    __Ownable_init();
  }

  function whitelistOperators(address[] calldata operators, bool isOk) external onlyOwner {
    uint256 length = operators.length;

    for (uint256 i = 0; i < length; i++) {
      whitelistedOperators[operators[i]] = isOk;
    }
  }

  function addWorkerManual(
    address token0,
    address token1,
    address worker,
    bool overwrite
  ) external override onlyWhitelistedOperators {
    if (!overwrite) ensureSlotUnoccupied(token0, token1);

    protocolWorkers[token0][token1] = worker;
    protocolWorkers[token1][token0] = worker;
  }

  function addWorkerAutoDiscover(address worker, bool overwrite)
    external
    override
    onlyWhitelistedOperators
  {
    IWorker _worker = IWorker(worker);

    (address token0, address token1) = (_worker.token0(), _worker.token1());

    if (!overwrite) ensureSlotUnoccupied(token0, token1);

    protocolWorkers[token0][token1] = worker;
    protocolWorkers[token1][token0] = worker;
  }

  function removeWorkerManual(address token0, address token1)
    external
    override
    onlyWhitelistedOperators
  {
    protocolWorkers[token0][token1] = address(0);
    protocolWorkers[token1][token0] = address(0);
  }

  function removeWorkerAutoDiscover(address worker) external override onlyWhitelistedOperators {
    IWorker _worker = IWorker(worker);

    (address token0, address token1) = (_worker.token0(), _worker.token1());

    protocolWorkers[token0][token1] = address(0);
    protocolWorkers[token1][token0] = address(0);
  }

  function ensureSlotUnoccupied(address token0, address token1) internal view {
    require(
      protocolWorkers[token0][token1] == address(0) &&
        protocolWorkers[token1][token0] == address(0),
      "WorkerRouter: Slot already occupied, set 'overwrite' flag to 'true' to overwrite current mapping"
    );
  }
}
