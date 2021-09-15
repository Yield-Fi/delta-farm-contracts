// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "../PancakeERC20.sol";

contract ERC20 is PancakeERC20 {
  constructor(uint256 _totalSupply) public {
    _mint(msg.sender, _totalSupply);
  }
}
