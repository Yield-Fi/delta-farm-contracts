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

  /// @dev Create a new add Token only strategy instance.
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
    address[] memory path = new address[](2);
    path[0] = baseToken;
    path[1] = farmingToken;

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
    view
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
    (uint256 rIn, ) = PancakeLibraryV2.getReserves(address(factory), baseToken, farmingToken);

    // find how many baseToken need to be converted to farmingToken
    // Constants come from
    // 2-f = 2-0.0025 = 19975
    // 4(1-f) = 4*9975*10000 = 399000000, where f = 0.0025 and 10,000 is a way to avoid floating point
    // 19975^2 = 399000625
    // 9975*2 = 19950

    return
      CustomMath.sqrt(rIn.mul(amount.mul(399000000).add(rIn.mul(399000625)))).sub(rIn.mul(19975)) /
      19950;
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
