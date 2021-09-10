// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.3;

interface IVault {
  /// @dev Return the total ERC20 entitled to the token holders. Be careful of unaccrued interests.
  function totalToken() external view returns (uint256);

  /// @dev Request funds from user through Vault
  function requestFunds(address targetedToken, uint256 amount) external;

  function token() external view returns (address);
}
