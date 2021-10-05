pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

contract ProtocolManager is OwnableUpgradeSafe {
  // Contains approved client contract's addresses
  mapping(address => bool) private approvedClients;

  function initialize() external initializer {
    __Ownable_init();
  }

  /// @dev Set new client contact as approved
  /// @param clientContract New client contact's address
  /// @param isApprove Client contract approval - true or false
  function approveClientContract(address clientContract, bool isApprove) external onlyOwner {
    approvedClients[clientContract] = isApprove;
  }

  /// @dev Check that the client contract is approved
  /// @param clientContract Client contract's address
  /// @return Client contract approval - true or false
  function isApprovedClientContract(address clientContract) external view returns (bool) {
    return approvedClients[clientContract];
  }
}
