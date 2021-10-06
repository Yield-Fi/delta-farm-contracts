pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import "./interfaces/IWBNB.sol";
import "./interfaces/IWrappedNativeTokenRelayer.sol";

contract WrappedNativeTokenRelayer is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IWrappedNativeTokenRelayer
{
  address wnative;

  /// @dev Function to initialize smart contract
  /// @param _wnative Address of wrapped native token
  function initialize(address _wnative) external initializer {
    __Ownable_init();
    __ReentrancyGuard_init();
    wnative = _wnative;
  }

  /// @dev Convert wrapped native token and withdraw native token
  /// @param _amount Amount of native token to withdraw
  function withdraw(uint256 _amount) external override nonReentrant {
    IWBNB(wnative).withdraw(_amount);
    (bool success, ) = msg.sender.call{ value: _amount }("");
    require(success, "WrappedNativeTokenRelayer->withdraw: can't withdraw");
  }

  receive() external payable {}
}
