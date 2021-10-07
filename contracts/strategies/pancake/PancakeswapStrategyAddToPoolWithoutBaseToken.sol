pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";
import "../../../contracts/libs/pancake/interfaces/IPancakeRouterV2.sol";

import "../../interfaces/IStrategy.sol";

import "../../utils/SafeToken.sol";
import "../../utils/CustomMath.sol";

contract PancakeswapStrategyAddToPoolWithoutBaseToken is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IStrategy
{
  using SafeToken for address;
  using SafeMath for uint256;

  IPancakeFactory public factory;
  IPancakeRouterV2 public router;

  /// @dev Create a new add to pool without base token strategy instance.
  /// @param _router The PancakeSwap Router smart contract.
  function initialize(IPancakeRouterV2 _router) external initializer {
    __Ownable_init();
    __ReentrancyGuard_init();

    factory = IPancakeFactory(_router.factory());
    router = _router;
  }

  /// @dev Execute worker strategy. Take BaseToken. Return LP tokens.
  /// @param data Extra calldata information passed along to this strategy.
  function execute(bytes calldata data) external override nonReentrant {
    // 1. Decode strategy params
    (address baseToken, address token0, address token1, uint256 minLPAmount) = abi.decode(
      data,
      (address, address, address, uint256)
    );

    // 2. Find appropriate lp tokens
    IPancakePair T0_T1_LP = IPancakePair(factory.getPair(token0, token1));
    IPancakePair BT_T0_LP = IPancakePair(factory.getPair(baseToken, token0));
    IPancakePair BT_T1_LP = IPancakePair(factory.getPair(baseToken, token1));

    // 3. Calculate amount of base token to swap on token 0
    uint256 amountOfBaseTokenToSwapOnToken0 = _calculateAmountOfBaseTokenToSwapOnToken0(
      T0_T1_LP,
      BT_T0_LP,
      BT_T1_LP,
      baseToken,
      token0
    );

    // 4. Add liquidity and get amount of new lp tokens
    uint256 amountOfNewLpTokens = _addLiquidity(
      amountOfBaseTokenToSwapOnToken0,
      baseToken,
      token0,
      token1
    );

    require(
      amountOfNewLpTokens >= minLPAmount,
      "PancakeswapStrategyAddToPoolWithoutBaseToken->execute: insufficient LP tokens received"
    );
    require(
      T0_T1_LP.transfer(msg.sender, T0_T1_LP.balanceOf(address(this))),
      "PancakeswapStrategyAddToPoolWithoutBaseToken->execute: failed to transfer LP token"
    );
    // 5. Reset approval for safety reason
    baseToken.safeApprove(address(router), 0);
    token0.safeApprove(address(router), 0);
    token1.safeApprove(address(router), 0);
  }

  function _addLiquidity(
    uint256 baseTokenToSwapOnToken0,
    address baseToken,
    address token0,
    address token1
  ) internal returns (uint256) {
    baseToken.safeApprove(address(router), uint256(-1));

    // 1. Swap baseToken to token0 and token1
    address[] memory baseTokenToToken0Path = new address[](2);
    baseTokenToToken0Path[0] = baseToken;
    baseTokenToToken0Path[1] = token0;
    router.swapExactTokensForTokens(
      baseTokenToSwapOnToken0,
      0,
      baseTokenToToken0Path,
      address(this),
      block.timestamp
    );

    address[] memory baseTokenToToken1Path = new address[](2);
    baseTokenToToken1Path[0] = baseToken;
    baseTokenToToken1Path[1] = token1;
    router.swapExactTokensForTokens(
      baseToken.myBalance(), // Rest of base token
      0,
      baseTokenToToken1Path,
      address(this),
      block.timestamp
    );

    // 2. Add liquidity and return amount of new lp tokens.
    token0.safeApprove(address(router), uint256(-1));
    token1.safeApprove(address(router), uint256(-1));

    (, , uint256 amountOfNewLpTokens) = router.addLiquidity(
      token0,
      token1,
      token0.myBalance(),
      token1.myBalance(),
      0,
      0,
      address(this),
      block.timestamp
    );

    return amountOfNewLpTokens;
  }

  function _calculateAmountOfBaseTokenToSwapOnToken0(
    IPancakePair t0_t1_LP,
    IPancakePair bt_t0_LP,
    IPancakePair bt_t1_LP,
    address baseToken,
    address token0
  ) internal view returns (uint256) {
    // Calculate ratio in which base token will be swapped to token0 and token1
    (uint256 x, uint256 y) = _calculateBaseTokenRatioToSwapOnTokens(
      t0_t1_LP,
      bt_t0_LP,
      bt_t1_LP,
      baseToken,
      token0
    );

    return baseToken.myBalance().mul(x).div(x.add(y));
  }

  function _calculateBaseTokenRatioToSwapOnTokens(
    IPancakePair t0_t1_LP,
    IPancakePair bt_t0_LP,
    IPancakePair bt_t1_LP,
    address baseToken,
    address token0
  ) internal view returns (uint256, uint256) {
    // Get reserves of tokens in given pools needed to the calculations
    // Naming convention: e.g. ResBTOK_bt_t0 - Reserve of base token in the baseToken-token0 pool
    (uint256 r0, uint256 r1, ) = t0_t1_LP.getReserves();
    (uint256 ResTOK0_t0_t1, uint256 ResTOK1_t0_t1) = t0_t1_LP.token0() == token0
      ? (r0, r1)
      : (r1, r0);

    (r0, r1, ) = bt_t0_LP.getReserves();
    (uint256 ResBTOK_bt_t0, uint256 ResTOK0_bt_t0) = bt_t0_LP.token0() == baseToken
      ? (r0, r1)
      : (r1, r0);

    (r0, r1, ) = bt_t1_LP.getReserves();
    (uint256 ResBTOK_bt_t1, uint256 ResTOK1_bt_t1) = bt_t1_LP.token0() == baseToken
      ? (r0, r1)
      : (r1, r0);

    uint256 x = ResTOK0_t0_t1.mul(ResBTOK_bt_t0).div(ResTOK0_bt_t0);
    uint256 y = ResTOK1_t0_t1.mul(ResBTOK_bt_t1).div(ResTOK1_bt_t1);

    return (x, y);
  }

  receive() external payable {}
}
