// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import "./interfaces/IVaultConfig.sol";
import "./interfaces/InterestModel.sol";

contract VaultConfig is Initializable, OwnableUpgradeSafe, IVaultConfig {
  /// @dev Event is emitted when configutation parameters will be changed
  /// @param caller Address which will set new parameters
  /// @param wrappedNativeToken Address of wrapped native token
  /// @param wrappedNativeTokenRelayer Address of WrappedNativeTokenRelayer contract
  /// @param treasuryAccount Address of treasury account
  event SetParams(
    address indexed caller,
    address wrappedNativeToken,
    address wrappedNativeTokenRelayer,
    address treasuryAccount
  );

  /// address for wrapped native eg WBNB, WETH
  address public override wrappedNativeToken;
  /// address for wNative Relayer
  address public override wrappedNativeTokenRelayer;
  /// address of treasury account
  address public override treasuryAccount;

  /// @dev Initialize new contract instance
  /// @param _wrappedNativeToken Address of wrapped native token
  /// @param _wrappedNativeTokenRelayer Address of WrappedNativeTokenRelayer contract
  /// @param _treasuryAccount Address of treasury account
  function initialize(
    address _wrappedNativeToken,
    address _wrappedNativeTokenRelayer,
    address _treasuryAccount
  ) external initializer {
    __Ownable_init();

    setParams(_wrappedNativeToken, _wrappedNativeTokenRelayer, _treasuryAccount);
  }

  /// @dev Set all the basic parameters. Must only be called by the owner.
  /// @param _wrappedNativeToken Address of wrapped native token
  /// @param _wrappedNativeTokenRelayer Address of WrappedNativeTokenRelayer contract
  /// @param _treasuryAccount Address of treasury account
  function setParams(
    address _wrappedNativeToken,
    address _wrappedNativeTokenRelayer,
    address _treasuryAccount
  ) public onlyOwner {
    wrappedNativeToken = _wrappedNativeToken;
    wrappedNativeTokenRelayer = _wrappedNativeTokenRelayer;
    treasuryAccount = _treasuryAccount;

    emit SetParams(_msgSender(), wrappedNativeToken, wrappedNativeTokenRelayer, _treasuryAccount);
  }
}
