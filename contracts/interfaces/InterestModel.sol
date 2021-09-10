// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.3;

interface InterestModel {
  /// @dev Return the interest rate per second, using 1e18 as denom.
  function getInterestRate(uint256 debt, uint256 floating) external view returns (uint256);
}
