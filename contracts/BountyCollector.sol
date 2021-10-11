// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

import { IBountyCollector } from "./interfaces/IBountyCollector.sol";
import { IProtocolManager } from "./interfaces/IProtocolManager.sol";
import { SafeToken } from "./utils/SafeToken.sol";

contract BountyCollector is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IBountyCollector
{
  /// @dev Libraries
  using SafeToken for address;
  using SafeMath for uint256;

  /// @dev Map YieldFi's clients' addresses to bounty amounts
  mapping(address => uint256) public bounties;

  /// Only whitelisted collector should be able to call collect-related functions
  mapping(address => bool) okCollectors;

  /// Config
  address _bountyToken;
  uint256 _bountyThreshold;
  IProtocolManager _protocolManager;

  modifier onlyWhitelistedCollectors() {
    require(okCollectors[msg.sender], "YieldFi BountyCollector::CollectorNotWhitelisted");
    _;
  }

  modifier onlyWhitelistedVaults() {
    require(
      _protocolManager.approvedVaults(msg.sender),
      "YieldFi BountyCollector::VaultNotWhitelisted"
    );
    _;
  }

  event Collect(address indexed _from, address indexed _to, uint256 _amount);

  function initialize(
    address bountyToken,
    uint256 bountyThreshold,
    address protocolManager
  ) external initializer {
    _setConfig(bountyToken, bountyThreshold, protocolManager);

    __Ownable_init();
    __ReentrancyGuard_init();
  }

  function _setConfig(
    address bountyToken,
    uint256 bountyThreshold,
    address protocolManager
  ) internal {
    require(bountyToken != address(0), "YieldFi BountyCollector::InvalidBountyTokenAddress");
    require(bountyThreshold > 0, "YieldFi BountyCollector::InvalidBountyThreshold");

    _bountyToken = bountyToken;
    _bountyThreshold = bountyThreshold;
    _protocolManager = IProtocolManager(protocolManager);
  }

  function setConfig(
    address bountyToken,
    uint256 bountyThreshold,
    address protocolManager
  ) external override onlyOwner {
    _setConfig(bountyToken, bountyThreshold, protocolManager);
  }

  /// Whitelist collectors so they can collect bounties
  function whitelistCollectors(address[] calldata collectors, bool ok) external override onlyOwner {
    for (uint128 i = 0; i < collectors.length; i++) {
      okCollectors[collectors[i]] = ok;
    }
  }

  function collect(address client) external override onlyWhitelistedCollectors {
    uint256 _bounty = bounties[client]; /// Gas savings

    require(_bounty >= _bountyThreshold, "YieldFi BountyCollector::BountyAmountTooLow");

    SafeToken.safeTransfer(_bountyToken, client, _bounty);

    bounties[client] = 0;

    emit Collect(msg.sender, client, _bounty);
  }

  /// @dev Be aware of gas cost!
  function collectAll() public view override onlyWhitelistedCollectors {
    require(false, "NOT IMPLEMENTED");
  }

  /// Register bounties (at the same time register amount for the client and for the yieldFi)
  /// One function to wrap two calls. They should be called one by one anyway.
  /// (If client recevies fee, yieldFi does as well)
  function registerBounties(address[] calldata clients, uint256[] calldata amounts)
    external
    override
    onlyWhitelistedVaults
    nonReentrant
  {
    require(clients.length == amounts.length, "YieldFi BountyCollector::BadCollectData");

    address clientAddress;
    uint256 length = clients.length;

    for (uint256 i = 0; i < length; i++) {
      clientAddress = clients[i];
      bounties[clientAddress] = bounties[clientAddress].add(amounts[i]);
    }
  }
}
