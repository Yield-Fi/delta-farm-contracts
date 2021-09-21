// SPDX-License-Identifier: MIT

pragma solidity 0.6.6;

import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

interface IWorker {
  /// @dev Work on a (potentially new) position. Optionally send token back to Vault.
  function work(
    uint256 id,
    address client,
    uint256 clientBps,
    bytes calldata data
  ) external;

  /// @dev Re-invest whatever the worker is working on.
  function reinvest() external;

  /// @dev Return the amount of base token to get back if we are to liquidate the position.
  function tokensToReceive(uint256 id) external view returns (uint256);

  /// @dev Liquidate the given position to token. Send all token back to its Vault.
  function liquidate(uint256 id) external;

  /// @dev SetStretegy that be able to executed by the worker.
  function setApprovedStrategies(address[] calldata strats, bool isOk) external;

  /// @dev Set address that can be reinvest
  function setReinvestorOk(address[] calldata reinvestor, bool isOk) external;

  /// @dev LP token holds by worker
  function lpToken() external view returns (IPancakePair);

  /// @dev Token that is swapped for tokens from pool
  function baseToken() external view returns (address);

  /// @dev Token 0 from the pool that worker is working on
  function token0() external view returns (address);

  /// @dev Token 1 from the pool that worker is working on
  function token1() external view returns (address);

  /// @dev Return the trading path that worker is using for convert BTOKEN->...->FTOKEN
  function getPath() external view returns (address[] memory);

  /// @dev Return the inverse of the path that worker is using for convert BTOKEN->...->FTOKEN
  function getReversedPath() external view returns (address[] memory);

  /// @dev Return the trading path that the worker is using to convert reward token to beneficial vault token
  function getRewardPath() external view returns (address[] memory);
}
