pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";
import "../../../contracts/libs/pancake/interfaces/IPancakeRouterV2.sol";
import "../../../contracts/libs/pancake/PancakeLibraryV2.sol";

import "../../interfaces/IStrategy.sol";

import "../../interfaces/IProtocolManager.sol";
import "../../utils/SafeToken.sol";
import "../../utils/CustomMath.sol";

contract PancakeswapStrategyAddToPoolWithoutBaseToken is
  Initializable,
  OwnableUpgradeSafe,
  ReentrancyGuardUpgradeSafe,
  IAddStrategy
{
  using SafeToken for address;
  using SafeMath for uint256;

  IPancakeFactory public factory;
  IPancakeRouterV2 public router;
  IProtocolManager public protocolManager;

  /// @dev Create a new add to pool without base token strategy instance.
  /// @param _router The PancakeSwap Router smart contract.
  function initialize(IPancakeRouterV2 _router, IProtocolManager _protocolManager)
    external
    initializer
  {
    __Ownable_init();
    __ReentrancyGuard_init();

    factory = IPancakeFactory(_router.factory());
    router = _router;
    protocolManager = _protocolManager;
  }

  /// @dev Execute worker strategy. Take BaseToken. Return LP tokens.
  /// @param data Extra calldata information passed along to this strategy.
  function execute(bytes calldata data) external override nonReentrant returns(uint256) {
    // 1. Decode strategy params
    (address baseToken, address token0, address token1, uint256 minLPAmount) = abi.decode(
      data,
      (address, address, address, uint256)
    );

    // 2. Find appropriate lp token
    IPancakePair T0_T1_LP = IPancakePair(factory.getPair(token0, token1));

    // 3. Calculate amount of base token to swap on token 0
    uint256 amountOfBaseTokenToSwapOnToken0 = _calculateAmountOfBaseTokenToSwapOnToken0(
      baseToken,
      token0,
      token1
    );

    // 3. Add liquidity and get amount of new lp tokens
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

    return T0_T1_LP.balanceOf(address(this));
  }

  function _addLiquidity(
    uint256 baseTokenToSwapOnToken0,
    address baseToken,
    address token0,
    address token1
  ) internal returns (uint256) {
    baseToken.safeApprove(address(router), uint256(-1));

    // 1. Swap baseToken to token0 and token1
    address[] memory baseTokenToToken0Path = _getBestPath(
      baseTokenToSwapOnToken0,
      baseToken,
      token0
    );

    router.swapExactTokensForTokens(
      baseTokenToSwapOnToken0,
      0,
      baseTokenToToken0Path,
      address(this),
      block.timestamp
    );

    address[] memory baseTokenToToken1Path = _getBestPath(
      baseTokenToSwapOnToken0,
      baseToken,
      token1
    );

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
    address baseToken,
    address token0,
    address token1
  ) internal view returns (uint256) {
    // Calculate ratio in which base token will be swapped to token0 and token1
    (uint256 x, uint256 y) = _estimateSplit(baseToken, token0, token1);

    return baseToken.myBalance().mul(x).div(x.add(y));
  }

  /// @dev Function to estimate amounts of split and swap of the base token
  /// @param baseToken Address of the base token
  /// @param token0 Address of the first of the token in pancake swap's pool
  /// @param token1 Address of the second of the token in pancake swap's pool
  /// @param amount Amount of base token to deposit
  /// @return uint256 Amount of the part of the base token after split
  /// @return uint256 Amount of the part of the base token after split
  /// @return uint256 Amount of the token0 which will be received from swapped base token
  /// @return uint256 Amount of the token1 which will be received from swapped base token
  function estimateAmounts(
    address baseToken,
    address token0,
    address token1,
    uint256 amount
  )
    external
    override
    returns (
      uint256,
      uint256,
      uint256,
      uint256
    )
  {
    // 1. Calculate amount of base token after split
    (
      uint256 firstPartOfBaseToken,
      uint256 secondPartOfBaseToken
    ) = _calculateAmountsOfBaseTokenAfterSplit(baseToken, token0, token1, amount);

    // 2. Estimate amounts and return it
    return (
      firstPartOfBaseToken,
      secondPartOfBaseToken,
      _getAmountOutHelper(firstPartOfBaseToken, baseToken, token0),
      _getAmountOutHelper(secondPartOfBaseToken, baseToken, token1)
    );
  }

  function _calculateAmountsOfBaseTokenAfterSplit(
    address baseToken,
    address token0,
    address token1,
    uint256 amount
  ) internal view returns (uint256, uint256) {
    (uint256 x, uint256 y) = _estimateSplit(baseToken, token0, token1);

    uint256 firstPartOfBaseToken = amount.mul(x).div(x.add(y));
    uint256 secondPartOfBaseToken = amount.sub(firstPartOfBaseToken);

    return (firstPartOfBaseToken, secondPartOfBaseToken);
  }

  function _getAmountOutHelper(
    uint256 amountIn,
    address tokenIn,
    address tokenOut
  ) internal view returns (uint256) {
    address[] memory path = _getBestPath(amountIn, tokenIn, tokenOut);

    uint256 amount = _getBestAmount(path, amountIn);

    return amount;
  }

  function _getBestPath(
    uint256 amountIn,
    address token0,
    address token1
  ) internal view returns (address[] memory) {
    address[] memory stables = protocolManager.getStables();

    uint256 l = stables.length;

    address[] memory bestPath = new address[](3);

    (uint256 reserveIn, uint256 reserveOut) = PancakeLibraryV2.getReserves(
      address(factory),
      token0,
      token1
    );

    uint256 bestAmountOut = PancakeLibraryV2.getAmountOut(amountIn, reserveIn, reserveOut);
    bestPath[0] = token0;
    bestPath[1] = token1;

    for (uint8 i = 0; i < l; i++) {
      address[] memory path = new address[](3);

      address stable = stables[i];

      if (token0 != stable && token1 != stable && _hopsValid(token0, stable, token1)) {
        path[0] = token0;
        path[1] = stable;
        path[2] = token1;

        uint256[] memory tempAmountOut = PancakeLibraryV2.getAmountsOut(
          address(factory),
          amountIn,
          path
        );

        if (tempAmountOut[2] > bestAmountOut) {
          bestAmountOut = tempAmountOut[2];

          bestPath[0] = token0;
          bestPath[1] = stables[i];
          bestPath[2] = token1;
        }
      }
    }

    return _trimPath(bestPath);
  }

  function _getBestAmount(address[] memory _path, uint256 amountIn)
    internal
    view
    returns (uint256)
  {
    uint256[] memory amounts = PancakeLibraryV2.getAmountsOut(address(factory), amountIn, _path);

    return amounts[amounts.length - 1];
  }

  function _trimPath(address[] memory _path) internal pure returns (address[] memory) {
    if (_path[2] == address(0)) {
      address[] memory path = new address[](2);

      path[0] = _path[0];
      path[1] = _path[1];

      return path;
    }

    return _path;
  }

  function _hopsValid(
    address token0,
    address stable,
    address token1
  ) internal view returns (bool) {
    bool firstHopValid = factory.getPair(token0, stable) != address(0);
    bool secondHopValid = factory.getPair(stable, token1) != address(0);

    return firstHopValid && secondHopValid;
  }

  function _estimateSplit(
    address baseToken,
    address token0,
    address token1
  ) internal view returns (uint256, uint256) {
    (uint256 reserveIn, uint256 reserveOut) = PancakeLibraryV2.getReserves(
      address(factory),
      token0,
      token1
    );

    address[] memory path0 = _getBestPath(1 ether, token0, baseToken);
    address[] memory path1 = _getBestPath(1 ether, token1, baseToken);

    uint256 equivalentIn = reserveIn;
    uint256 equivalentOut = reserveOut;

    for (uint256 i = 1; i < path0.length; i++) {
      (uint256 res0, uint256 res1) = PancakeLibraryV2.getReserves(
        address(factory),
        path0[i - 1],
        path0[i]
      );

      equivalentIn = equivalentIn.mul(res1).div(res0);
    }

    for (uint256 i = 1; i < path1.length; i++) {
      (uint256 res0, uint256 res1) = PancakeLibraryV2.getReserves(
        address(factory),
        path1[i - 1],
        path1[i]
      );

      equivalentOut = equivalentOut.mul(res1).div(res0);
    }

    return (equivalentIn, equivalentOut);
  }

  receive() external payable {}
}
