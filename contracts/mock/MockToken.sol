// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.3;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MockToken is
  Initializable,
  ERC20Upgradeable,
  OwnableUpgradeable,
  UUPSUpgradeable
{
  function initialize(string memory _name, string memory _symbol)
    public
    initializer
  {
    __ERC20_init(_name, _symbol);
    __Ownable_init();
    __UUPSUpgradeable_init();
  }

  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }

  function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyOwner
  {}
}
