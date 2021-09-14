// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.3;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../libs/pancake/interfaces/IPancakePair.sol";
import "../libs/pancake/interfaces/IPancakeRouterV2.sol";
import "../libs/pancake/interfaces/IPancakeMasterChef.sol";

import "../interfaces/IStrategy.sol";
import "../utils/SafeToken.sol";

contract PancakeswapWorker2 is
  Initializable,
  OwnableUpgradeable,
  UUPSUpgradeable,
  ReentrancyGuardUpgradeable
{
  using SafeMathUpgradeable for uint256;
  using SafeToken for address;

  struct Pool {
    address lpToken;
    address token0;
    address token1;
    uint256 id;
  }

  Pool pool;

  address vaultAddress;
  address baseToken;
  address cake;
  address reinvestStrategy;
  address WBNB;

  IPancakeMasterChef masterChef;
  IPancakeRouterV2 router;

  mapping(uint256 => uint256) balances;
  uint256 totalBalance;

  address defiAddress;
  uint256 defiFeeBps;
  address clientAddress;
  uint256 clientFeeBps;
  uint256 reinvestThreshold;

  modifier onlyVault() {
    require(msg.sender == vaultAddress, "Not assigned vault");
    _;
  }

  function initialize (
    address _vaultAddress,
    address _baseToken,
    IPancakeMasterChef _masterChef,
    IPancakeRouterV2 _router,
    uint256 _poolId
  ) external initializer {
    __Ownable_init();
    __UUPSUpgradeable_init();

    vaultAddress = _vaultAddress;
    baseToken = _baseToken;

    masterChef = _masterChef;
    router = _router;
    cake = address(masterChef.cake());
    WBNB = router.WETH();

    (address lpToken, , ,) = masterChef.poolInfo(_poolId);
    pool.id = _poolId;
    pool.lpToken = lpToken;
    pool.token0 = IPancakePair(pool.lpToken).token0();
    pool.token1 = IPancakePair(pool.lpToken).token1();

    require(baseToken != cake, "Base token cannot be a reward token");
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}

  function setReinvestConfig (
    address _defiAddress,
    uint256 _defiFeeBps,
    address _clientAddress,
    uint256 _clientFeeBps,
    address _reinvestStrategy,
    uint256 _reinvestThreshold
  ) external onlyOwner {
    defiAddress = _defiAddress;
    defiFeeBps = _defiFeeBps;
    clientAddress = _clientAddress;
    clientFeeBps = _clientFeeBps;
    reinvestThreshold = _reinvestThreshold;
    reinvestStrategy = _reinvestStrategy;
  }

  function _reinvest() internal {
    // 1. Withdraw all the rewards. Return if reward <= _reinvestThreshold.
    masterChef.withdraw(pool.id, 0);
    uint256 reward = cake.balanceOf(address(this));
    if (reward <= reinvestThreshold) return;

    // 2. Approve tokens
    cake.safeApprove(address(router), type(uint256).max);
    pool.lpToken.safeApprove(address(masterChef), type(uint256).max);

    uint256 defiFeeAmount = reward.mul(defiFeeBps).div(10000);
    uint256 clientFeeAmount = reward.mul(clientFeeBps).div(10000);
    if (defiFeeAmount > 0) {
      cake.safeTransfer(defiAddress, defiFeeAmount);
    }

    if (clientFeeAmount > 0) {
      cake.safeTransfer(clientAddress, clientFeeAmount);
    }

    address[] memory reinvestPath;
    reinvestPath[0] = cake;
    reinvestPath[1] = pool.token0;
    // 4. Convert all the remaining rewards to BaseToken according to config path.
    router.swapExactTokensForTokens(
      reward.sub(defiFeeAmount).sub(clientFeeAmount),
      0,
      reinvestPath,
      address(this),
      block.timestamp
    );

    pool.token0.safeTransfer(
      reinvestStrategy,
      pool.token0.myBalance()
    );
    IStrategy(reinvestStrategy).execute(abi.encode(0));

    // 6. Stake LPs for more rewards
    masterChef.deposit(pool.id, pool.lpToken.balanceOf(address(this)));

    // 7. Reset approval
    cake.safeApprove(address(router), 0);
    pool.lpToken.safeApprove(address(masterChef), 0);
  }

  function executeStrategy(
      uint256 positionId,
      address strategy,
      bytes calldata strategyParams
  ) external onlyVault nonReentrant {
    unstakeLpTokens(positionId);

    if(defiAddress != address(0) && defiFeeBps != 0)
      _reinvest();

    pool.lpToken.safeTransfer(strategy, pool.lpToken.balanceOf(address(this)));
    IStrategy(strategy).execute(strategyParams);

    stakeLpTokens(positionId);
  }

  function tokensToReceive(
    uint256 positionId
  ) external view returns(uint256) {
    uint256 lpBalance = balances[positionId];
    uint256 lpTotalSupply = IPancakePair(pool.lpToken).totalSupply();

    (uint256 reserveToken0, uint256 reserveToken1,) = IPancakePair(pool.lpToken).getReserves();
    /// TODO: Estimate base tokens amount to receive after withdraw from pool
    return 1000000;
  }

  function stakeLpTokens(uint256 id) internal {
    uint256 balance = pool.lpToken.balanceOf(address(this));
    if(balance > 0) {
      pool.lpToken.safeApprove(address(masterChef), type(uint256).max);
      masterChef.deposit(pool.id, balance);
      balances[id] = balances[id].add(balance);
      totalBalance = totalBalance.add(balance);
      pool.lpToken.safeApprove(address(masterChef), 0);
    }
  }

  function unstakeLpTokens(uint256 id) internal {
    uint256 balance = balances[id];
    if(balance > 0) {
      masterChef.withdraw(pool.id, balance);
      balances[id] = 0;
      totalBalance = totalBalance.sub(balance);
    }
  }
}
