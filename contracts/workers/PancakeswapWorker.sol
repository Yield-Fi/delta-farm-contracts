pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

import "../libs/pancake/interfaces/IPancakeRouterV2.sol";
import "../libs/pancake/PancakeLibraryV2.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IWorker.sol";
import "../libs/pancake/interfaces/IPancakeMasterChef.sol";
import "../utils/CustomMath.sol";
import "../utils/SafeToken.sol";
import "../interfaces/IVault.sol";

import "hardhat/console.sol";

contract PancakeswapWorker is OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe, IWorker {
  /// @notice Libraries
  using SafeToken for address;
  using SafeMath for uint256;

  /// @notice Events
  event Harvest(uint256 reward);
  event AddShare(uint256 indexed id, uint256 share);
  event RemoveShare(uint256 indexed id, uint256 share);
  event SetTreasuryFee(address indexed caller, uint256 bountyBps);
  event SetApprovedStrategy(
    address indexed caller,
    address indexed strategy,
    bool indexed isApproved
  );
  event SetHarvestersOK(address indexed caller, address indexed harvestor, bool indexed isOk);
  event SetMaxHarvestBountyBps(address indexed caller, uint256 indexed maxFeeBps);
  event SetRewardToFeePath(address indexed caller, address[] newRewardPath);
  event SetHarvestConfig(address indexed caller, uint256 harvestThreshold, address[] harvestPath);
  event SendFeeToBountyCollector(
    address indexed clientAccount,
    uint256 clientFee,
    uint256 treasuryFee
  );

  /// @notice Configuration variables
  IPancakeFactory public factory;
  IPancakeMasterChef public masterChef;
  IPancakeRouterV2 public router;
  IPancakePair public override lpToken;
  address public wNative;
  address public override baseToken;
  address public override token0;
  address public override token1;
  address public cake;
  address public operatingVault;
  uint256 public pid;

  /// @notice [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, Liquidate]
  address[] private strategies;
  mapping(address => bool) private approvedStrategies;

  /// @notice Mutable state variables
  mapping(uint256 => uint256) public shares;
  uint256[] private positionIds;
  uint256 public totalShare;
  uint256 public override treasuryFeeBps;
  mapping(address => uint256) public clientFeesBps;
  uint256 public maxFeeBps;
  mapping(address => bool) public okHarvesters;

  /// @notice Configuration variables for PancakeswapV2
  uint256 public fee;
  uint256 public feeDenom;

  /// @notice Upgraded State Variables for PancakeswapWorker
  uint256 public harvestThreshold;
  address[] public harvestPath;

  function initialize(
    address _operatingVault,
    address _baseToken,
    IPancakeMasterChef _masterChef,
    IPancakeRouterV2 _router,
    uint256 _pid,
    address[] calldata _harvestPath,
    uint256 _harvestThreshold,
    uint256 _treasuryFeeBps
  ) external initializer {
    // 1. Initialized imported library
    OwnableUpgradeSafe.__Ownable_init();
    ReentrancyGuardUpgradeSafe.__ReentrancyGuard_init();

    // 2. Assign dependency contracts
    operatingVault = _operatingVault;
    wNative = _router.WETH();
    masterChef = _masterChef;
    router = _router;
    factory = IPancakeFactory(_router.factory());

    // 3. Assign tokens state variables
    baseToken = _baseToken;
    pid = _pid;
    (IERC20 _lpToken, , , ) = masterChef.poolInfo(_pid);
    lpToken = IPancakePair(address(_lpToken));
    token0 = lpToken.token0();
    token1 = lpToken.token1();
    cake = address(masterChef.cake());

    // 5. Assign Re-invest parameters
    treasuryFeeBps = _treasuryFeeBps;
    harvestThreshold = _harvestThreshold;
    harvestPath = _harvestPath;
    maxFeeBps = 1000;

    // 6. Set PancakeswapV2 swap fees
    fee = 9975;
    feeDenom = 10000;

    // 7. Check if critical parameters are config properly
    require(
      baseToken != cake,
      "PancakeswapWorker::initialize:: base token cannot be a reward token"
    );
    require(
      treasuryFeeBps <= maxFeeBps,
      "PancakeswapWorker::initialize:: treasuryFeeBps exceeded maxFeeBps"
    );
    require(
      _harvestPath.length >= 2,
      "PancakeswapWorker::setHarvestConfig:: _harvestPath length must >= 2"
    );
    require(
      _harvestPath[0] == cake && _harvestPath[_harvestPath.length - 1] == baseToken,
      "PancakeswapWorker::setHarvestConfig:: _harvestPath must start with CAKE, end with baseToken"
    );
  }

  /// @dev Require that the caller must be an EOA account to avoid flash loans.
  modifier onlyEOA() {
    require(msg.sender == tx.origin, "PancakeswapWorker::onlyEOA:: not eoa");
    _;
  }

  /// @dev Require that the caller must be the operatingVault.
  modifier onlyOperator() {
    require(msg.sender == operatingVault, "PancakeswapWorker::onlyOperator:: not operatingVault");
    _;
  }

  //// @dev Require that the caller must be ok harvester.
  modifier onlyHarvester() {
    require(okHarvesters[msg.sender], "PancakeswapWorker::onlyHarvester:: not harvester");
    _;
  }

  /// @dev Return the entitied LP token balance for the given shares.
  /// @param share The number of shares to be converted to LP balance.
  function shareToBalance(uint256 share) public view returns (uint256) {
    if (totalShare == 0) return share; // When there's no share, 1 share = 1 balance.
    (uint256 totalBalance, ) = masterChef.userInfo(pid, address(this));
    return share.mul(totalBalance).div(totalShare);
  }

  /// @dev Return the number of shares to receive if staking the given LP tokens.
  /// @param balance the number of LP tokens to be converted to shares.
  function balanceToShare(uint256 balance) public view returns (uint256) {
    if (totalShare == 0) return balance; // When there's no share, 1 share = 1 balance.
    (uint256 totalBalance, ) = masterChef.userInfo(pid, address(this));
    return balance.mul(totalShare).div(totalBalance);
  }

  /// @dev Harvest reward tokens, swap them on base token and send to the Vault.
  function harvestRewards() external override onlyEOA onlyHarvester nonReentrant {
    // 1. Withdraw all the rewards. Return if reward <= _harvestThreshold.
    masterChef.withdraw(pid, 0);
    uint256 reward = cake.balanceOf(address(this));

    if (reward <= harvestThreshold) return;

    // 2. Approve tokens
    cake.safeApprove(address(router), uint256(-1));

    // 3. Convert all rewards to BaseToken according to config path.
    router.swapExactTokensForTokens(reward, 0, getHarvestPath(), address(this), block.timestamp);

    // 4. Send all base token to the operatingVault
    baseToken.safeTransfer(operatingVault, baseToken.myBalance());

    // 5. Calculate the amount of reward for the given positions
    uint256 numberOfPositions = positionIds.length;
    uint256[] storage rewardsPerPosition;
    for (uint256 i = 0; i < numberOfPositions; i++) {
      uint256 positionShare = shares[positionIds[i]];
      rewardsPerPosition[i] = reward.mul(positionShare).div(totalShare);
    }

    // 6. Register rewards
    IVault(operatingVault).registerRewards(positionIds, rewardsPerPosition);

    // 7. Reset approval
    cake.safeApprove(address(router), 0);

    emit Harvest(reward);
  }

  /// @dev Work on the given position. Must be called by the operatingVault.
  /// @param id The position ID to work on.
  /// @param data The encoded data, consisting of strategy address and calldata.
  function work(uint256 id, bytes calldata data) external override onlyOperator nonReentrant {
    addPositionId(id);
    // 1. Convert this position back to LP tokens.
    _removeShare(id);
    // 2. Perform the worker strategy; sending LP tokens + BaseToken; expecting LP tokens + BaseToken.
    (address strat, bytes memory ext) = abi.decode(data, (address, bytes));
    require(approvedStrategies[strat], "PancakeswapWorker::work:: unapproved work strategy");
    require(
      lpToken.transfer(strat, lpToken.balanceOf(address(this))),
      "PancakeswapWorker::work:: unable to transfer lp to strat"
    );
    baseToken.safeTransfer(strat, baseToken.myBalance());
    IStrategy(strat).execute(ext);
    // 3. Add LP tokens back to the farming pool.
    _addShare(id);
    // 4. Return any remaining BaseToken back to the operatingVault.
    baseToken.safeTransfer(msg.sender, baseToken.myBalance());
  }

  /// @dev Return the amount of BaseToken to receive if we are to liquidate the given position.
  /// @param id The position ID.
  function tokensToReceive(uint256 id) external view override returns (uint256) {
    // 1. Get the position's LP balance and LP total supply.
    uint256 lpBalance = shareToBalance(shares[id]);
    uint256 lpSupply = lpToken.totalSupply(); // Ignore pending mintFee as it is insignificant
    // 2. Get the reserves of token0 and token1 in the pool
    (uint256 r0, uint256 r1, ) = lpToken.getReserves();
    (uint256 totalToken0, uint256 totalToken1) = lpToken.token0() == token0 ? (r0, r1) : (r1, r0);
    // 3. Convert the position's LP tokens to the underlying assets.
    uint256 userToken0 = lpBalance.mul(totalToken0).div(lpSupply);
    uint256 userToken1 = lpBalance.mul(totalToken1).div(lpSupply);
    // 4. Estimate and return amount of base token to receive
    if (token0 == baseToken) {
      return
        _estimateSwapOutput(token1, baseToken, userToken1, userToken1, userToken0).add(userToken0);
    }

    if (token1 == baseToken) {
      return
        _estimateSwapOutput(token0, baseToken, userToken0, userToken0, userToken1).add(userToken1);
    }

    return
      _estimateSwapOutput(token0, baseToken, userToken0, userToken0, 0).add(
        _estimateSwapOutput(token1, baseToken, userToken1, userToken1, 0)
      );
  }

  /// Function to estimate swap result on pancakeswap router
  function _estimateSwapOutput(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 reserveInToSubtract,
    uint256 reserveOutToSubtract
  ) internal view returns (uint256) {
    if (amountIn <= 0) {
      return 0;
    }
    // 1. Get the reserves of tokenIn and tokenOut
    IPancakePair Tin_Tout_LP = IPancakePair(factory.getPair(tokenIn, tokenOut));
    (uint256 r0, uint256 r1, ) = Tin_Tout_LP.getReserves();
    (uint256 totalTokenIn, uint256 totalTokenOut) = Tin_Tout_LP.token0() == tokenIn
      ? (r0, r1)
      : (r1, r0);

    // 2. Get amountOut from pancakeswap
    return
      PancakeLibraryV2.getAmountOut(
        amountIn,
        totalTokenIn.sub(reserveInToSubtract),
        totalTokenOut.sub(reserveOutToSubtract)
      );
  }

  /// @dev Internal function to stake all outstanding LP tokens to the given position ID.
  function _addShare(uint256 id) internal {
    uint256 balance = lpToken.balanceOf(address(this));
    if (balance > 0) {
      // 1. Approve token to be spend by masterChef
      address(lpToken).safeApprove(address(masterChef), uint256(-1));
      // 2. Convert balance to share
      uint256 share = balanceToShare(balance);
      // 3. Deposit balance to PancakeMasterChef
      masterChef.deposit(pid, balance);
      // 4. Update shares
      shares[id] = shares[id].add(share);
      totalShare = totalShare.add(share);
      // 5. Reset approve token
      address(lpToken).safeApprove(address(masterChef), 0);
      emit AddShare(id, share);
    }
  }

  /// @dev Internal function to remove shares of the ID and convert to outstanding LP tokens.
  function _removeShare(uint256 id) internal {
    uint256 share = shares[id];
    if (share > 0) {
      uint256 balance = shareToBalance(share);
      masterChef.withdraw(pid, balance);
      totalShare = totalShare.sub(share);
      shares[id] = 0;
      emit RemoveShare(id, share);
    }
  }

  /// @dev Set addresses of the supported strategies
  /// @param supportedStrategies Array of strategies,
  /// expect [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, Liquidate]
  function setStrategies(address[] calldata supportedStrategies) external override onlyOwner {
    require(
      supportedStrategies.length == 3,
      "PancakeswapWorker->setStrategies: Array of strategies must have 3 items"
    );
    strategies = supportedStrategies;
    for (uint256 i; i < strategies.length; i++) {
      approvedStrategies[strategies[i]] = true;
    }
  }

  /// @dev Get addresses of the supported strategies
  /// @return Array of strategies: [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, Liquidate]
  function getStrategies() external view override returns (address[] memory) {
    return strategies;
  }

  /// @dev Internal function to get harvest path. Return route through WBNB if harvestPath not set.
  function getHarvestPath() public view returns (address[] memory) {
    if (harvestPath.length != 0) return harvestPath;
    address[] memory path;
    if (baseToken == wNative) {
      path = new address[](2);
      path[0] = address(cake);
      path[1] = address(wNative);
    } else {
      path = new address[](3);
      path[0] = address(cake);
      path[1] = address(wNative);
      path[2] = address(baseToken);
    }
    return path;
  }

  /// @dev Set the harvest configuration.
  /// @param _harvestThreshold - The threshold to update.
  /// @param _harvestPath - The harvest path to update.
  function setHarvestConfig(uint256 _harvestThreshold, address[] calldata _harvestPath)
    external
    onlyOwner
  {
    require(
      _harvestPath.length >= 2,
      "PancakeswapWorker::setHarvestConfig:: _harvestPath length must >= 2"
    );
    require(
      _harvestPath[0] == cake && _harvestPath[_harvestPath.length - 1] == baseToken,
      "PancakeswapWorker::setHarvestConfig:: _harvestPath must start with CAKE, end with baseToken"
    );

    harvestThreshold = _harvestThreshold;
    harvestPath = _harvestPath;

    emit SetHarvestConfig(msg.sender, _harvestThreshold, _harvestPath);
  }

  /// @dev Set Max harvest reward for set upper limit harvest bounty.
  /// @param _maxFeeBps - The max harvest bounty value to update.
  function setMaxHarvestBountyBps(uint256 _maxFeeBps) external onlyOwner {
    require(
      _maxFeeBps >= treasuryFeeBps,
      "PancakeswapWorker::setMaxHarvestBountyBps:: _maxFeeBps lower than treasuryFeeBps"
    );
    require(
      _maxFeeBps <= 3000,
      "PancakeswapWorker::setMaxHarvestBountyBps:: _maxFeeBps exceeded 30%"
    );

    maxFeeBps = _maxFeeBps;

    emit SetMaxHarvestBountyBps(msg.sender, maxFeeBps);
  }

  /// @dev Set the given address's to be harvestor.
  /// @param harvesters - The harvest bot addresses.
  /// @param isOk - Whether to approve or unapprove the given strategies.
  function setHarvestersOk(address[] calldata harvesters, bool isOk) external override onlyOwner {
    uint256 len = harvesters.length;
    for (uint256 idx = 0; idx < len; idx++) {
      okHarvesters[harvesters[idx]] = isOk;

      emit SetHarvestersOK(msg.sender, harvesters[idx], isOk);
    }
  }

  /// @dev Set treasury configurations.
  /// @param _treasuryFeeBps - The fee in BPS that will be charged
  function setTreasuryFee(uint256 _treasuryFeeBps) external onlyOwner {
    require(
      _treasuryFeeBps <= maxFeeBps,
      "PancakeswapWorker::setTreasuryFee:: _treasuryFeeBps exceeded maxFeeBps"
    );
    treasuryFeeBps = _treasuryFeeBps;
  }

  /// @dev Get fee in bps for given client
  /// @param clientAccount address of client account
  function getClientFee(address clientAccount) external view override returns (uint256) {
    return clientFeesBps[clientAccount];
  }

  /// @dev Set fee in bps for specific client
  /// @param clientAccount address of client account
  /// @param clientFeeBps The fee in BPS
  function setClientFee(address clientAccount, uint256 clientFeeBps) external override {
    clientFeesBps[clientAccount] = clientFeeBps;
  }

  /// @dev add new position id to the array with position ids
  /// @param positionId The position ID to work on
  function addPositionId(uint256 positionId) internal {
    uint256 numberOfPositions = positionIds.length;

    // End the execution of function if position id is contained in the array
    for (uint256 i = 0; i < numberOfPositions; i++) {
      if (positionIds[i] == positionId) {
        return;
      }
    }

    // Add new positon id to the array
    positionIds.push(positionId);
  }
}
