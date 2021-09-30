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

contract PancakeStrategyAddToPoolWithoutBaseToken is
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

    // 2. Find appropriate lp token
    IPancakePair lpToken = IPancakePair(factory.getPair(token0, token1));

    baseToken.safeApprove(address(router), uint256(-1));

    // 3. Get params for _addLiquidity function
    uint256 baseTokenBalance = baseToken.myBalance();
    (uint256 r0, uint256 r1, ) = lpToken.getReserves();

    // 4. Add liquidity and get amount of new lp tokens
    uint256 amountOfNewLpTokens = _addLiquidity(
      baseToken,
      baseTokenBalance,
      token0,
      token1,
      r0,
      r1
    );

    require(
      amountOfNewLpTokens >= minLPAmount,
      "PancakeStrategyAddToPoolWithoutBaseToken::execute:: insufficient LP tokens received"
    );
    require(
      lpToken.transfer(msg.sender, lpToken.balanceOf(address(this))),
      "PancakeStrategyAddToPoolWithoutBaseToken::execute:: failed to transfer LP token to msg.sender"
    );
    // 5. Reset approval for safety reason
    baseToken.safeApprove(address(router), 0);
    token0.safeApprove(address(router), 0);
    token1.safeApprove(address(router), 0);
  }

  function _addLiquidity(
    address baseToken,
    uint256 baseTokenBalance,
    address token0,
    address token1,
    uint256 reserveToken0,
    uint256 reserveToken1
  ) internal returns (uint256) {
    // 1. Calculate amount of base token to swap on token0
    uint256 baseTokenToSwapOnToken0 = baseTokenBalance.mul(reserveToken0).div(
      reserveToken0.add(reserveToken1)
    );

    // 2. Swap baseToken to token0 and token1
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

    // 5. Add liquidity and back lt token to the sender.
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

  receive() external payable {}
}
