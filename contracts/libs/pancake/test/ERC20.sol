// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.3;

import "../PancakeERC20.sol";

contract ERC20 is PancakeERC20 {
  constructor(uint256 _totalSupply) {
    _mint(msg.sender, _totalSupply);
  }
}
