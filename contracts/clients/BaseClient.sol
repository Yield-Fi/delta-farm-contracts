pragma solidity 0.6.6;

import { IWorker } from "../interfaces/IWorker.sol";
import { IVault } from "../interfaces/IVault.sol";

abstract contract BaseClient {
  string _KIND_;
  string _CLIENT_NAME_;

  function deposit(
    address endUser,
    address worker,
    uint256 amount
  ) external {
    // 1. Some fancy stuff goes here - obtian add liquidity strategy address & vault address
    // Ad.1 Solution proposal: Reversed obtainement?
    // address addLiquidityStrategy = worker.getAddLiquidityStrategy()
    address addLiquidityStrategy = address(0);

    IWorker _worker = IWorker(worker);

    IVault vault = IVault(_worker.getOperatingVault());

    /// @dev encoded: (address strat, (address baseToken, address farmingToken, uint256 minLPAmount))
    vault.work(
      0,
      address(worker),
      amount,
      endUser,
      abi.encode(addLiquidityStrategy, abi.encode(_worker.token0(), _worker.token1(), 0))
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
