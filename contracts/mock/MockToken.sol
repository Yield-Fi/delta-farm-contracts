// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

contract MockToken is
  Initializable,
  ERC20UpgradeSafe,
  OwnableUpgradeSafe
{
  function initialize(string memory _name, string memory _symbol)
    public
    initializer
  {
    __ERC20_init(_name, _symbol);
    __Ownable_init();
  }

  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }
}
