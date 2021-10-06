// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import "./interfaces/IVaultConfig.sol";
import "./interfaces/InterestModel.sol";

contract VaultConfig is Initializable, OwnableUpgradeSafe, IVaultConfig {
  /// @notice Events
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

  function initialize(
    address _wrappedNativeToken,
    address _wrappedNativeTokenRelayer,
    address _treasuryAccount
  ) external initializer {
    __Ownable_init();

    setParams(_wrappedNativeToken, _wrappedNativeTokenRelayer, _treasuryAccount);
  }

  /// @dev Set all the basic parameters. Must only be called by the owner.
  /// @param _wrappedNativeToken Address of WBNB
  /// @param _wrappedNativeTokenRelayer Address of WNativeRelayer contract
  /// @param _treasuryAccount Address of treasury account
  function setParams(
    address _wrappedNativeToken,
    address _wrappedNativeTokenRelayer,
    address _treasuryAccount
  ) public onlyOwner {
    wrappedNativeToken = _wrappedNativeToken;
    wrappedNativeTokenRelayer = _wrappedNativeTokenRelayer;

    emit SetParams(_msgSender(), wrappedNativeToken, wrappedNativeTokenRelayer, _treasuryAccount);
  }
}
