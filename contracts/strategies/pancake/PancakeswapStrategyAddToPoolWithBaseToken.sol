// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";
import "../../../contracts/libs/pancake/PancakeLibraryV2.sol";

import "../../../contracts/libs/pancake/interfaces/IPancakeRouterV2.sol";
import "../../interfaces/IStrategy.sol";
import "../../interfaces/IProtocolManager.sol";
import "../../utils/SafeToken.sol";
import "../../utils/CustomMath.sol";

contract PancakeswapStrategyAddToPoolWithBaseToken is
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

  /// @dev Create a new add Token only strategy instance.
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
  function execute(bytes calldata data) external override nonReentrant returns (uint256) {
    // 1. Find out what farming token we are dealing with and min additional LP tokens.
    (address baseToken, address farmingToken, uint256 minLPAmount) = abi.decode(
      data,
      (address, address, uint256)
    );

    IPancakePair lpToken = IPancakePair(factory.getPair(farmingToken, baseToken));
    // 2. Approve router to do their stuffs
    farmingToken.safeApprove(address(router), uint256(-1));
    baseToken.safeApprove(address(router), uint256(-1));
    // 3. Compute the optimal amount of baseToken to be converted to farmingToken.
    uint256 aIn = calculateBaseTokenAmountToSwap(baseToken, farmingToken, baseToken.myBalance());

    // 4. Convert that portion of baseToken to farmingToken.
    address[] memory path = _getBestPath(aIn, baseToken, farmingToken);

    router.swapExactTokensForTokens(aIn, 0, path, address(this), block.timestamp);
    // 5. Mint more LP tokens and return all LP tokens to the sender.
    (, , uint256 moreLPAmount) = router.addLiquidity(
      baseToken,
      farmingToken,
      baseToken.myBalance(),
      farmingToken.myBalance(),
      0,
      0,
      address(this),
      block.timestamp
    );
    require(
      moreLPAmount >= minLPAmount,
      "PancakeswapV2StrategyAddBaseTokenOnly::execute:: insufficient LP tokens received"
    );
    require(
      lpToken.transfer(msg.sender, lpToken.balanceOf(address(this))),
      "PancakeswapV2StrategyAddBaseTokenOnly::execute:: failed to transfer LP token to msg.sender"
    );
    // 6. Reset approval for safety reason
    baseToken.safeApprove(address(router), 0);
    farmingToken.safeApprove(address(router), 0);
    return lpToken.balanceOf(address(this));
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
    uint256 firstPartOfBaseToken = calculateBaseTokenAmountToSwap(
      baseToken,
      baseToken == token0 ? token1 : token0,
      amount
    );

    uint256 secondPartOfBaseToken = amount.sub(firstPartOfBaseToken);

    // 2. Estimate amounts and return it
    return
      baseToken == token0
        ? (
          secondPartOfBaseToken,
          firstPartOfBaseToken,
          secondPartOfBaseToken,
          _getAmountOutHelper(firstPartOfBaseToken, baseToken, token1)
        )
        : (
          firstPartOfBaseToken,
          secondPartOfBaseToken,
          _getAmountOutHelper(firstPartOfBaseToken, baseToken, token0),
          secondPartOfBaseToken
        );
  }

  function calculateBaseTokenAmountToSwap(
    address baseToken,
    address farmingToken,
    uint256 amount
  ) internal view returns (uint256) {
    // Calculate ratio in which base token will be swapped to token0 and token1
    (uint256 x, uint256 y) = _estimateSplit(baseToken, farmingToken);

    return amount.mul(x).div(x.add(y));
  }

  function _estimateSplit(address baseToken, address farmingToken)
    internal
    view
    returns (uint256, uint256)
  {
    (uint256 reserveIn, uint256 reserveOut) = PancakeLibraryV2.getReserves(
      address(factory),
      baseToken,
      farmingToken
    );

    address[] memory path = _getBestPath(1 ether, farmingToken, baseToken);

    uint256 equivalentOut = reserveOut;

    for (uint256 i = 1; i < path.length; i++) {
      (uint256 res0, uint256 res1) = PancakeLibraryV2.getReserves(
        address(factory),
        path[i - 1],
        path[i]
      );

      equivalentOut = equivalentOut.mul(res1).div(res0);
    }

    return (reserveIn, equivalentOut);
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

  function _getAmountOutHelper(
    uint256 amountIn,
    address tokenIn,
    address tokenOut
  ) internal view returns (uint256) {
    (uint256 reserveIn, uint256 reserveOut) = PancakeLibraryV2.getReserves(
      address(factory),
      tokenIn,
      tokenOut
    );

    return PancakeLibraryV2.getAmountOut(amountIn, reserveIn, reserveOut);
  }
}
