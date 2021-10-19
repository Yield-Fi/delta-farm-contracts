pragma solidity 0.6.6;

contract MockVault {
  address public token;
  mapping(uint256 => uint256) public rewards;

  constructor(address _token) public {
    token = _token;
  }

  function executeTransaction(
    address target,
    uint256 value,
    string calldata signature,
    bytes calldata data
  ) external payable returns (bytes memory) {
    bytes memory callData;

    if (bytes(signature).length == 0) {
      callData = data;
    } else {
      callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
    }

    // solium-disable-next-line security/no-call-value
    (bool success, bytes memory returnData) = target.call{ value: value }(callData);
    require(success, _getRevertMsg(returnData));

    return returnData;
  }

  function _getRevertMsg(bytes memory _returnData) internal pure returns (string memory) {
    // If the _res length is less than 68, then the transaction failed silently (without a revert message)
    if (_returnData.length < 68) return "Transaction reverted silently";

    assembly {
      // Slice the sighash.
      _returnData := add(_returnData, 0x04)
    }
    return abi.decode(_returnData, (string)); // All that remains is the revert string
  }

  function registerRewards(uint256[] calldata pids, uint256[] calldata amounts) external {
    for (uint256 i = 0; i < pids.length; i++) {
      rewards[pids[i]] = amounts[i];
    }
  }
}
