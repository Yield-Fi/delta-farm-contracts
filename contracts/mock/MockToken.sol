// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20, Ownable {
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) public {}

  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }
}
