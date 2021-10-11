// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

import "./ProtocolManager.sol";
import "./interfaces/IFeeCollector.sol";
import "./utils/SafeToken.sol";

contract FeeCollector is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IFeeCollector
{
  /// @dev Libraries
  using SafeToken for address;
  using SafeMath for uint256;

  /// @dev Event is emitted when fee will be collected
  /// @param _from Address of account which calls collect
  /// @param _to Address to withdraw collected fee
  /// @param _amount Amount of withdrawn fee
  event Collect(address indexed _from, address indexed _to, uint256 _amount);

  /// @dev Event is emitted when fees will be registered
  /// @param vault Address of vault which will register new fees
  /// @param accounts Address of fee recipients
  /// @param fees Amounts of fee
  event RegisterFees(address indexed vault, address[] accounts, uint256[] fees);

  /// @dev Map YieldFi's clients' addresses to fee amounts
  mapping(address => uint256) public fees;

  /// Config
  address _feeToken;
  uint256 _feeThreshold;
  ProtocolManager protocolManager;

  modifier onlyCollector() {
    require(
      protocolManager.approvedClients(msg.sender) ||
        protocolManager.whitelistedOperators(msg.sender),
      "FeeCollector: not approved collector"
    );
    _;
  }

  modifier onlyWhitelistedVaults() {
    require(protocolManager.approvedVaults(msg.sender), "FeeCollector: not approved vault");
    _;
  }

  function initialize(
    address feeToken,
    uint256 feeThreshold,
    ProtocolManager _protocolManager
  ) external initializer {
    _setConfig(feeToken, feeThreshold);
    protocolManager = _protocolManager;

    __Ownable_init();
    __ReentrancyGuard_init();
  }

  function _setConfig(address feeToken, uint256 feeThreshold) internal {
    require(feeToken != address(0), "FeeCollector: invalid fee token address");
    require(feeThreshold > 0, "FeeCollector: invalid fee threshold");

    _feeToken = feeToken;
    _feeThreshold = feeThreshold;
  }

  /// @dev Set new configuration for the fee collector
  /// @param feeToken Address of token in which fee is accumulated
  /// @param feeThreshold The threshold for claiming fee
  function setConfig(address feeToken, uint256 feeThreshold) external override onlyOwner {
    _setConfig(feeToken, feeThreshold);
  }

  /// @dev Collect all fee for given account
  /// @notice Can be called only by approved clients or protocol's operators
  function collect() external override onlyCollector {
    uint256 _fee = fees[msg.sender]; /// Gas savings

    require(_fee >= _feeThreshold, "FeeCollector: fee amount too low");

    SafeToken.safeTransfer(_feeToken, msg.sender, _fee);

    fees[msg.sender] = 0;

    emit Collect(msg.sender, msg.sender, _fee);
  }

  /// @dev Register bounties (at the same time register amount for the client and for the yieldFi)
  /// One function to wrap two calls. They should be called one by one anyway.
  /// (If client recevies fee, yieldFi does as well)
  /// @param accounts Array of accounts address
  /// @param amounts Array of fee amounts assign to the specific accounts
  /// @notice Function can be called by Vault contract
  function registerFees(address[] calldata accounts, uint256[] calldata amounts)
    external
    override
    onlyWhitelistedVaults
    nonReentrant
  {
    require(accounts.length == amounts.length, "YieldFi FeeCollector::BadCollectData");

    address accountAddress;
    uint256 length = accounts.length;

    for (uint256 i = 0; i < length; i++) {
      accountAddress = accounts[i];

      fees[accountAddress] = fees[accountAddress].add(amounts[i]);
    }
  }

  /// @dev Returns address of fee token
  /// @return address Address of fee token
  function getFeeToken() external view override returns (address) {
    return _feeToken;
  }

  /// @dev Returns amount of fee to collect
  /// @notice Function can be called only by approved clients or protocol's operators
  function feeToCollect() external view override onlyCollector returns (uint256) {
    return fees[msg.sender];
  }
}
