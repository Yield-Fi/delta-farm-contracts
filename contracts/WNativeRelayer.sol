// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import "./interfaces/IWBNB.sol";
import "./interfaces/IWNativeRelayer.sol";

contract WNativeRelayer is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IWNativeRelayer
{
  address wnative;

  function initialize(address _wnative) external initializer {
    __Ownable_init();
    __ReentrancyGuard_init();
    wnative = _wnative;
  }

  function withdraw(uint256 _amount) external override nonReentrant {
    IWBNB(wnative).withdraw(_amount);
    (bool success, ) = msg.sender.call{ value: _amount }("");
    require(success, "WNativeRelayer::onlyWhitelistedCaller:: can't withdraw");
  }

  receive() external payable {}
}
