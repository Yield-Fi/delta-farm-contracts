// SPDX-License-Identifier: MIT

pragma solidity 0.6.6;

import "../libs/pancake/interfaces/IPancakePair.sol";

interface IWorker2 {
  function executeStrategy(
      uint256 positionId,
      address strategy,
      bytes calldata strategyParams
  ) external;
}
