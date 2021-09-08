// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.3;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

import "../../libs/pancake/IPancakeRouter.sol";
import "../../interfaces/IStrategy.sol";
import "../../utils/SafeToken.sol";
import "../../utils/CustomMath.sol";

contract PancakeswapAddBaseTokenOnlyStrategy is
  Initializable,
  UUPSUpgradeable,
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable,
  IStrategy
{
  using SafeToken for address;
  using SafeMathUpgradeable for uint256;
  IPancakeFactory public factory;
  IPancakeRouter public router;

  /// @dev Create a new add Token only strategy instance.
  /// @param _router The PancakeSwap Router smart contract.
  function initialize(IPancakeRouter _router) external initializer {
    ReentrancyGuardUpgradeable.__ReentrancyGuard_init();
    __Ownable_init();
    __UUPSUpgradeable_init();

    factory = IPancakeFactory(_router.factory());
    router = _router;
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}

  /// @dev Execute worker strategy. Take BaseToken. Return LP tokens.
  /// @param data Extra calldata information passed along to this strategy.
  function execute(
    address, /* user */
    uint256, /* debt */
    bytes calldata data
  ) external override nonReentrant {
    // 1. Find out what farming token we are dealing with and min additional LP tokens.
    (address baseToken, address farmingToken, uint256 minLPAmount) = abi.decode(
      data,
      (address, address, uint256)
    );

    IPancakePair lpToken = IPancakePair(
      factory.getPair(farmingToken, baseToken)
    );

    // 2. Approve router to do their stuffs
    farmingToken.safeApprove(address(router), type(uint256).max);
    baseToken.safeApprove(address(router), type(uint256).max);

    // 3. Compute the optimal amount of baseToken to be converted to farmingToken.
    uint256 balance = baseToken.myBalance();
    (uint256 r0, uint256 r1, ) = lpToken.getReserves();
    uint256 rIn = lpToken.token0() == baseToken ? r0 : r1;

    // find how many baseToken need to be converted to farmingToken
    // Constants come from
    // 2-f = 2-0.0025 = 19975
    // 4(1-f) = 4*9975*10000 = 399000000, where f = 0.0025 and 10,000 is a way to avoid floating point
    // 19975^2 = 399000625
    // 9975*2 = 19950

    uint256 aIn = CustomMath
      .sqrt(rIn.mul(balance.mul(399000000).add(rIn.mul(399000625))))
      .sub(rIn.mul(19975)) / 19950;

    // 4. Convert that portion of baseToken to farmingToken.
    address[] memory path = new address[](2);
    path[0] = baseToken;
    path[1] = farmingToken;
    router.swapExactTokensForTokens(
      aIn,
      0,
      path,
      address(this),
      block.timestamp
    );

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
      "AddBaseTokenOnlyStrategy - insufficient LP tokens received"
    );

    require(
      lpToken.transfer(msg.sender, lpToken.balanceOf(address(this))),
      "AddBaseTokenOnlyStrategy - failed to transfer LP token to msg.sender"
    );

    // 6. Reset approval for safety reason
    baseToken.safeApprove(address(router), 0);
    farmingToken.safeApprove(address(router), 0);
  }
}
