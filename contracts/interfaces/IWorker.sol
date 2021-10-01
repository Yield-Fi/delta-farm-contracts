// SPDX-License-Identifier: MIT

pragma solidity 0.6.6;

import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

interface IWorker {
  /// @dev Work on a (potentially new) position. Optionally send token back to Vault.
  function work(uint256 id, bytes calldata data) external;

  /// @dev Harvest reward tokens, swap them on base token and send to the Vault.
  function harvestRewards() external;

  /// @dev Return the amount of base token to get back if we are to liquidate the position.
  function tokensToReceive(uint256 id) external view returns (uint256);

  /// @dev SetStretegy that be able to executed by the worker.
  function setApprovedStrategies(address[] calldata strats, bool isOk) external;

  /// @dev Set address that can be harvest
  function setHarvestersOk(address[] calldata harvesters, bool isOk) external;

  /// @dev LP token holds by worker
  function lpToken() external view returns (IPancakePair);

  /// @dev Token that is swapped for tokens from pool
  function baseToken() external view returns (address);

  /// @dev Token 0 from the pool that worker is working on
  function token0() external view returns (address);

  /// @dev Token 1 from the pool that worker is working on
  function token1() external view returns (address);

  /// @dev Treasury fee in BPS
  function treasuryFeeBps() external view returns (uint256);

  /// @dev Get fee in bps for given client
  function getClientFee(address clientAccount) external view returns (uint256);

  /// @dev Set fee in bps for specific client
  function setClientFee(address clientAccount, uint256 clientFeeBps) external;

  /// @dev Get operating vault address.
  function getOperatingVault() external view returns (address);

  /// @dev Get add base token only strategy address
  function criticalAddBaseTokenOnlyStrategy() external view returns (address);
}
