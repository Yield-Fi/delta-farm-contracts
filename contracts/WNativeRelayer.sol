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
  mapping(address => bool) okCallers;

  modifier onlyWhitelistedCaller() {
    require(
      okCallers[msg.sender] == true,
      "WNativeRelayer::onlyWhitelistedCaller:: !okCaller"
    );
    _;
  }

  function initialize(address _wnative) external initializer {
    __Ownable_init();
    __UUPSUpgradeable_init();
    wnative = _wnative;
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}

  function setCallerOk(address[] calldata whitelistedCallers, bool isOk)
    external
    onlyOwner
  {
    uint256 len = whitelistedCallers.length;
    for (uint256 idx = 0; idx < len; idx++) {
      okCallers[whitelistedCallers[idx]] = isOk;
    }
  }

  function withdraw(uint256 _amount)
    external
    override
    onlyWhitelistedCaller
    nonReentrant
  {
    IWBNB(wnative).withdraw(_amount);
    (bool success, ) = msg.sender.call{ value: _amount }("");
    require(success, "WNativeRelayer::onlyWhitelistedCaller:: can't withdraw");
  }

  receive() external payable {}
}
