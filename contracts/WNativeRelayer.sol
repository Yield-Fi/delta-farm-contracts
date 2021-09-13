// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.3;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/IWBNB.sol";
import "./interfaces/IWNativeRelayer.sol";

contract WNativeRelayer is
  Initializable,
  UUPSUpgradeable,
  ReentrancyGuardUpgradeable,
  OwnableUpgradeable,
  IWNativeRelayer
{
  address wnative;

  function initialize(address _wnative) external initializer {
    __Ownable_init();
    __UUPSUpgradeable_init();
    wnative = _wnative;
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}

  function withdraw(uint256 _amount) external override nonReentrant {
    IWBNB(wnative).withdraw(_amount);
    (bool success, ) = msg.sender.call{ value: _amount }("");
    require(success, "WNativeRelayer::onlyWhitelistedCaller:: can't withdraw");
  }

  receive() external payable {}
}
