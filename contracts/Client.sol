pragma solidity 0.6.6;

import { IWorker } from "./interfaces/IWorker.sol";
import { IVault } from "./interfaces/IVault.sol";

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

import "./utils/SafeToken.sol";

contract Client is Initializable, OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe {
  using SafeMath for uint256;
  using SafeToken for address;

  string _KIND_;
  string _CLIENT_NAME_;

  function initialize(string memory kind, string memory clientName) public initializer {
    _KIND_ = kind;
    _CLIENT_NAME_ = clientName;
  }

  function deposit(
    address endUser,
    address worker,
    uint256 amount,
    address strat
  ) external {
    // 1. Some fancy stuff goes here - obtian add liquidity strategy address & vault address
    // Ad.1 Solution proposal: Reversed obtainement?
    // address addLiquidityStrategy = worker.getAddLiquidityStrategy()
    address addLiquidityStrategy = address(0);

    IWorker _worker = IWorker(worker);

    IVault vault = IVault(_worker.getOperatingVault());

    address vaultToken = vault.token();

    vaultToken.safeApprove(address(vault), amount);

    /// @dev encoded: (address strat, (address baseToken, address farmingToken, uint256 minLPAmount))
    vault.work(
      0,
      address(worker),
      amount,
      endUser,
      abi.encode(strat, abi.encode(_worker.token1(), _worker.token0(), 0))
    );
  }

  function withdraw(
    address endUser,
    address worker,
    uint256 amount
  ) external {
    // 1. Some fancy stuff goes here - obtian liquidate strategy address
    // Ad.1 Solution proposal: Reversed obtainement?
    // address liquidationStrategy = worker.getLiquidationStrategy()
    address liquidationStrategy = address(0);

    IWorker _worker = IWorker(worker);

    IVault vault = IVault(_worker.getOperatingVault());

    /// @dev encoded: (address strat, (address baseToken, address farmingToken, uint256 minLPAmount))
    vault.work(
      0,
      address(worker),
      amount,
      endUser,
      abi.encode(liquidationStrategy, abi.encode(_worker.token0(), _worker.token1(), 0))
    );
  }
}
