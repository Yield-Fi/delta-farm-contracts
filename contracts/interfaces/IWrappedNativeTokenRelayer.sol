pragma solidity 0.6.6;

interface IWrappedNativeTokenRelayer {
  /// @dev Convert wrapped native token and withdraw native token
  /// @param _amount Amount of native token to withdraw
  function withdraw(uint256 _amount) external;
}
