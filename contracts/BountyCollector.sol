// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

import "./interfaces/IBountyCollector.sol";
import "./utils/SafeToken.sol";

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
  /// Workers will call contract upon each reinvest-related event
  mapping(address => bool) okWorkers;

  /// Config
  address _bountyToken;
  uint256 _bountyThreshold;

  modifier onlyWhitelistedCollectors() {
    require(okCollectors[msg.sender], "YieldFi BountyCollector::CollectorNotWhitelisted");
    _;
  }

  modifier onlyWhitelistedWorkers() {
    require(okWorkers[msg.sender], "YieldFi BountyCollector::WorkerNotWhitelisted");
    _;
  }

  event Collect(address indexed _from, address indexed _to, uint256 _amount);

  function initialize(address bountyToken, uint256 bountyThreshold) external initializer {
    _setConfig(bountyToken, bountyThreshold);

    __Ownable_init();
    __ReentrancyGuard_init();
  }

  function _setConfig(address bountyToken, uint256 bountyThreshold) internal {
    require(bountyToken != address(0), "YieldFi BountyCollector::InvalidBountyTokenAddress");
    require(bountyThreshold > 0, "YieldFi BountyCollector::InvalidBountyThreshold");

    _bountyToken = bountyToken;
    _bountyThreshold = bountyThreshold;
  }

  function setConfig(address bountyToken, uint256 bountyThreshold) external override onlyOwner {
    _setConfig(bountyToken, bountyThreshold);
  }

  /// Whitetlist collectors so they can collect bounties
  function whitelistCollectors(address[] calldata collectors, bool ok) external override onlyOwner {
    for (uint128 i = 0; i < collectors.length; i++) {
      okCollectors[collectors[i]] = ok;
    }
  }

  /// Whitetlist worker so it can register new bounties
  function whitelistWorkers(address[] calldata workers, bool ok) external override onlyOwner {
    for (uint128 i = 0; i < workers.length; i++) {
      okWorkers[workers[i]] = ok;
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
    onlyWhitelistedWorkers
    nonReentrant
  {
    require(clients.length == amounts.length, "YieldFi BountyCollector::BadCollectData");

    address clientAddres;
    uint256 length = clients.length;

    for (uint256 i = 0; i < length; i++) {
      clientAddres = clients[i];

      bounties[clientAddres] = bounties[clientAddres].add(amounts[i]);
    }
  }
}
