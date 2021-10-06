// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

interface IVaultConfig {
  /// @dev Return the address of wrapped native token.
  function wrappedNativeToken() external view returns (address);

  /// @dev Return the address of wNative relayer.
  function wrappedNativeTokenRelayer() external view returns (address);

  /// @dev Return the address of treasury account.
  function treasuryAccount() external view returns (address);
}
