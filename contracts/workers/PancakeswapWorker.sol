pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

import "../libs/pancake/interfaces/IPancakeRouterV2.sol";
import "../interfaces/IStrategy.sol";
import "../interfaces/IWorker.sol";
import "../libs/pancake/interfaces/IPancakeMasterChef.sol";
import "../utils/CustomMath.sol";
import "../utils/SafeToken.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IBountyCollector.sol";

contract PancakeswapWorker is OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe, IWorker {
  /// @notice Libraries
  using SafeToken for address;
  using SafeMath for uint256;

  /// @notice Events
  event Reinvest(address indexed caller, uint256 reward, uint256 bounty);
  event AddShare(uint256 indexed id, uint256 share);
  event RemoveShare(uint256 indexed id, uint256 share);
  event SetTreasuryConfig(address indexed caller, address indexed account, uint256 bountyBps);
  event SetApprovedStrategy(
    address indexed caller,
    address indexed strategy,
    bool indexed isApproved
  );
  event SetReinvestorOK(address indexed caller, address indexed reinvestor, bool indexed isOk);
  event SetReinvestStrategy(address indexed caller, IStrategy indexed reinvestStrategy);
  event SetMaxReinvestBountyBps(address indexed caller, uint256 indexed maxFeeBps);
  event SetRewardToFeePath(address indexed caller, address[] newRewardPath);
  event SetReinvestConfig(
    address indexed caller,
    uint256 reinvestThreshold,
    address[] reinvestPath
  );
  event SendFeeToBountyCollector(
    address indexed clientAccount,
    uint256 clientFee,
    uint256 treasuryFee
  );

  /// @notice Configuration variables
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

  /// @notice Mutable state variables
  mapping(uint256 => uint256) public shares;
  mapping(address => bool) public approvedStrategies;
  uint256 public totalShare;
  IStrategy public reinvestStrategy;
  uint256 public treasuryFeeBps;
  uint256 public maxFeeBps;
  mapping(address => bool) public okReinvestors;

  /// @notice Configuration variables for PancakeswapV2
  uint256 public fee;
  uint256 public feeDenom;

  /// @notice Upgraded State Variables for PancakeswapWorker
  uint256 public reinvestThreshold;
  address[] public reinvestPath;
  IBountyCollector public bountyCollector;
  address[] public rewardToFeePath;

  function initialize(
    address _operatingVault,
    address _baseToken,
    IPancakeMasterChef _masterChef,
    IPancakeRouterV2 _router,
    uint256 _pid,
    IStrategy _reinvestStrategy,
    address[] calldata _reinvestPath,
    uint256 _reinvestThreshold,
    IBountyCollector _bountyCollector,
    uint256 _treasuryFeeBps,
    address[] calldata _rewardToFeePath
  ) external initializer {
    // 1. Initialized imported library
    OwnableUpgradeSafe.__Ownable_init();
    ReentrancyGuardUpgradeSafe.__ReentrancyGuard_init();

    // 2. Assign dependency contracts
    operatingVault = _operatingVault;
    wNative = _router.WETH();
    masterChef = _masterChef;
    router = _router;

    // 3. Assign tokens state variables
    baseToken = _baseToken;
    pid = _pid;
    (IERC20 _lpToken, , , ) = masterChef.poolInfo(_pid);
    lpToken = IPancakePair(address(_lpToken));
    token0 = lpToken.token0();
    token1 = lpToken.token1();
    cake = address(masterChef.cake());

    // 4. Assign critical strategy contracts
    reinvestStrategy = _reinvestStrategy;
    approvedStrategies[address(reinvestStrategy)] = true;

    // 5. Assign Re-invest parameters
    treasuryFeeBps = _treasuryFeeBps;
    reinvestThreshold = _reinvestThreshold;
    reinvestPath = _reinvestPath;
    bountyCollector = _bountyCollector;
    rewardToFeePath = _rewardToFeePath;
    maxFeeBps = 500;

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
      _reinvestPath.length >= 2,
      "PancakeswapWorker::setReinvestConfig:: _reinvestPath length must >= 2"
    );
    require(
      _reinvestPath[0] == cake &&
        (_reinvestPath[_reinvestPath.length - 1] == token0 ||
          _reinvestPath[_reinvestPath.length - 1] == token1),
      "PancakeswapWorker::setReinvestConfig:: _reinvestPath must start with CAKE, end with token0 or token1"
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

  //// @dev Require that the caller must be ok reinvestor.
  modifier onlyReinvestor() {
    require(okReinvestors[msg.sender], "PancakeswapWorker::onlyReinvestor:: not reinvestor");
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

  /// @dev Re-invest whatever this worker has earned back to staked LP tokens.
  function reinvest() external override onlyEOA onlyReinvestor nonReentrant {
    _reinvest(bountyCollector, treasuryFeeBps, address(0), 0, 0, 0, 0);
  }

  /// @dev internal method for reinvest.
  /// @param _bountyCollector - The account to receive reinvest fees.
  /// @param _treasuryFeeBps - The fees in BPS that will be charged for reinvest.
  /// @param _clientAccount The client account to receive reinvest fee.
  /// @param _clientFeeBps The fee in BPS that will be charged for client.
  /// @param _positionId The position ID to work on.
  /// @param _callerBalance - The balance that is owned by the msg.sender within the execution scope.
  /// @param _reinvestThreshold - The threshold to be reinvested if pendingCake pass over.
  function _reinvest(
    IBountyCollector _bountyCollector,
    uint256 _treasuryFeeBps,
    address _clientAccount,
    uint256 _clientFeeBps,
    uint256 _positionId,
    uint256 _callerBalance,
    uint256 _reinvestThreshold
  ) internal {
    require(
      address(_bountyCollector) != address(0),
      "PancakeswapWorker::_reinvest:: bad treasury account"
    );
    // 1. Withdraw all the rewards. Return if reward <= _reinvestThreshold.
    masterChef.withdraw(pid, 0);
    uint256 reward = cake.balanceOf(address(this));

    if (reward <= _reinvestThreshold) return;

    // 2. Approve tokens
    cake.safeApprove(address(router), uint256(-1));
    address(lpToken).safeApprove(address(masterChef), uint256(-1));

    uint256 rewardFromShare;
    if (_positionId != 0 && shares[_positionId] != 0) {
      rewardFromShare = shares[_positionId].mul(reward) / totalShare;
    }

    // 3. Send the reward fee to the _bountyCollector.
    uint256 treasuryFee = rewardFromShare.mul(_treasuryFeeBps) / 10000;
    uint256 clientFee = rewardFromShare.mul(_clientFeeBps) / 10000;
    if (treasuryFee > 0) {
      _sendFeeToBountyCollector(treasuryFee, _clientAccount, clientFee);
    }

    // 4. Convert all the remaining rewards to BaseToken according to config path.
    router.swapExactTokensForTokens(
      reward.sub(treasuryFee).sub(clientFee),
      0,
      getReinvestPath(),
      address(this),
      block.timestamp
    );

    // 5. Use add Token strategy to convert all BaseToken without both caller balance and buyback amount to LP tokens.
    token0.safeTransfer(address(reinvestStrategy), token0.myBalance().sub(_callerBalance));
    reinvestStrategy.execute(abi.encode(token0, token1, "0"));

    // 6. Stake LPs for more rewards
    masterChef.deposit(pid, lpToken.balanceOf(address(this)));

    // 7. Reset approval
    cake.safeApprove(address(router), 0);
    address(lpToken).safeApprove(address(masterChef), 0);

    emit Reinvest(address(_bountyCollector), reward, treasuryFee);
  }

  /// @dev Work on the given position. Must be called by the operatingVault.
  /// @param id The position ID to work on.
  /// @param client The client account to receive reinvest fee.
  /// @param clientBps The fee in BPS that will be charged for client.
  /// @param data The encoded data, consisting of strategy address and calldata.
  function work(
    uint256 id,
    address client,
    uint256 clientBps,
    bytes calldata data
  ) external override onlyOperator nonReentrant {
    // 1. If a treasury configs are not ready. Not reinvest.
    if (address(bountyCollector) != address(0) && treasuryFeeBps != 0)
      _reinvest(
        bountyCollector,
        treasuryFeeBps,
        client,
        clientBps,
        id,
        token0.myBalance(),
        reinvestThreshold
      );
    // 2. Convert this position back to LP tokens.
    _removeShare(id);
    // 3. Perform the worker strategy; sending LP tokens + BaseToken; expecting LP tokens + BaseToken.
    (address strat, bytes memory ext) = abi.decode(data, (address, bytes));
    require(approvedStrategies[strat], "PancakeswapWorker::work:: unapproved work strategy");
    require(
      lpToken.transfer(strat, lpToken.balanceOf(address(this))),
      "PancakeswapWorker::work:: unable to transfer lp to strat"
    );
    baseToken.safeTransfer(strat, baseToken.myBalance());
    IStrategy(strat).execute(ext);
    // 4. Add LP tokens back to the farming pool.
    _addShare(id);
    // 5. Return any remaining BaseToken back to the operatingVault.
    baseToken.safeTransfer(msg.sender, baseToken.myBalance());
  }

  /// @dev Return maximum output given the input amount and the status of Uniswap reserves.
  /// @param aIn The amount of asset to market sell.
  /// @param rIn the amount of asset in reserve for input.
  /// @param rOut The amount of asset in reserve for output.
  function getMktSellAmount(
    uint256 aIn,
    uint256 rIn,
    uint256 rOut
  ) public view returns (uint256) {
    if (aIn == 0) return 0;
    require(rIn > 0 && rOut > 0, "PancakeswapWorker::getMktSellAmount:: bad reserve values");
    uint256 aInWithFee = aIn.mul(fee);
    uint256 numerator = aInWithFee.mul(rOut);
    uint256 denominator = rIn.mul(feeDenom).add(aInWithFee);
    return numerator / denominator;
  }

  /// @dev Return the amount of BaseToken to receive if we are to liquidate the given position.
  /// @param id The position ID.
  function tokensToReceive(uint256 id) external view override returns (uint256) {
    // 1. Get the position's LP balance and LP total supply.
    uint256 lpBalance = shareToBalance(shares[id]);
    uint256 lpSupply = lpToken.totalSupply(); // Ignore pending mintFee as it is insignificant
    // 2. Get the pool's total supply of BaseToken and FarmingToken.
    (uint256 r0, uint256 r1, ) = lpToken.getReserves();
    (uint256 totalBaseToken, uint256 totalFarmingToken) = lpToken.token0() == baseToken
      ? (r0, r1)
      : (r1, r0);
    // 3. Convert the position's LP tokens to the underlying assets.
    uint256 userBaseToken = lpBalance.mul(totalBaseToken).div(lpSupply);
    uint256 userFarmingToken = lpBalance.mul(totalFarmingToken).div(lpSupply);
    // 4. Convert all FarmingToken to BaseToken and return total BaseToken.
    return
      getMktSellAmount(
        userFarmingToken,
        totalFarmingToken.sub(userFarmingToken),
        totalBaseToken.sub(userBaseToken)
      ).add(userBaseToken);
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

  /// @dev Internal function to get reinvest path. Return route through WBNB if reinvestPath not set.
  function getReinvestPath() public view returns (address[] memory) {
    if (reinvestPath.length != 0) return reinvestPath;
    address[] memory path;
    if (token0 == wNative) {
      path = new address[](2);
      path[0] = address(cake);
      path[1] = address(wNative);
    } else {
      path = new address[](3);
      path[0] = address(cake);
      path[1] = address(wNative);
      path[2] = address(token0);
    }
    return path;
  }

  /// @dev Set the reinvest configuration.
  /// @param _reinvestThreshold - The threshold to update.
  /// @param _reinvestPath - The reinvest path to update.
  function setReinvestConfig(uint256 _reinvestThreshold, address[] calldata _reinvestPath)
    external
    onlyOwner
  {
    require(
      _reinvestPath.length >= 2,
      "PancakeswapWorker::setReinvestConfig:: _reinvestPath length must >= 2"
    );
    require(
      _reinvestPath[0] == cake &&
        (_reinvestPath[_reinvestPath.length - 1] == token0 ||
          _reinvestPath[_reinvestPath.length - 1] == token1),
      "PancakeswapWorker::setReinvestConfig:: _reinvestPath must start with CAKE, end with token0 or token1"
    );

    reinvestThreshold = _reinvestThreshold;
    reinvestPath = _reinvestPath;

    emit SetReinvestConfig(msg.sender, _reinvestThreshold, _reinvestPath);
  }

  /// @dev Set Max reinvest reward for set upper limit reinvest bounty.
  /// @param _maxFeeBps - The max reinvest bounty value to update.
  function setMaxReinvestBountyBps(uint256 _maxFeeBps) external onlyOwner {
    require(
      _maxFeeBps >= treasuryFeeBps,
      "PancakeswapWorker::setMaxReinvestBountyBps:: _maxFeeBps lower than treasuryFeeBps"
    );
    require(
      _maxFeeBps <= 3000,
      "PancakeswapWorker::setMaxReinvestBountyBps:: _maxFeeBps exceeded 30%"
    );

    maxFeeBps = _maxFeeBps;

    emit SetMaxReinvestBountyBps(msg.sender, maxFeeBps);
  }

  /// @dev Set the given strategies' approval status.
  /// @param strats - The strategy addresses.
  /// @param isApproved - Whether to approve or unapprove the given strategies.
  function setApprovedStrategies(address[] calldata strats, bool isApproved)
    external
    override
    onlyOwner
  {
    uint256 len = strats.length;
    for (uint256 idx = 0; idx < len; idx++) {
      approvedStrategies[strats[idx]] = isApproved;

      emit SetApprovedStrategy(msg.sender, strats[idx], isApproved);
    }
  }

  /// @dev Set the given address's to be reinvestor.
  /// @param reinvestors - The reinvest bot addresses.
  /// @param isOk - Whether to approve or unapprove the given strategies.
  function setReinvestorOk(address[] calldata reinvestors, bool isOk) external override onlyOwner {
    uint256 len = reinvestors.length;
    for (uint256 idx = 0; idx < len; idx++) {
      okReinvestors[reinvestors[idx]] = isOk;

      emit SetReinvestorOK(msg.sender, reinvestors[idx], isOk);
    }
  }

  /// @dev Set a new reward path. In case that the liquidity of the reward path is changed.
  /// @param _rewardToFeePath The new reward path.
  function setRewardPath(address[] calldata _rewardToFeePath) external onlyOwner {
    require(
      _rewardToFeePath.length >= 2,
      "PancakeswapWorker::setRewardPath:: rewardToFeePath length must be >= 2"
    );
    require(
      _rewardToFeePath[0] == cake && _rewardToFeePath[_rewardToFeePath.length - 1] == baseToken,
      "PancakeswapWorker::setRewardPath:: rewardToFeePath must start with CAKE and end with base token"
    );

    rewardToFeePath = _rewardToFeePath;

    emit SetRewardToFeePath(msg.sender, _rewardToFeePath);
  }

  /// @dev Update critical strategy smart contracts. EMERGENCY ONLY. Bad strategies can steal funds.
  /// @param _reinvestStrategy - The new add strategy contract.
  function setReinvestStrategy(IStrategy _reinvestStrategy) external onlyOwner {
    reinvestStrategy = _reinvestStrategy;

    emit SetReinvestStrategy(msg.sender, reinvestStrategy);
  }

  /// @dev Set treasury configurations.
  /// @param _bountyCollector - The treasury address to update
  /// @param _treasuryFeeBps - The treasury bounty to update
  function setTreasuryConfig(IBountyCollector _bountyCollector, uint256 _treasuryFeeBps)
    external
    onlyOwner
  {
    require(
      _treasuryFeeBps <= maxFeeBps,
      "PancakeswapWorker::setTreasuryConfig:: _treasuryFeeBps exceeded maxFeeBps"
    );

    bountyCollector = _bountyCollector;
    treasuryFeeBps = _treasuryFeeBps;

    emit SetTreasuryConfig(msg.sender, address(bountyCollector), treasuryFeeBps);
  }

  /// @dev Convert reward token to base token and send fee to bounty collector
  /// @param treasuryFee Amount of treasury fee in reward token
  /// @param clientAccount Client account to receive client fee
  /// @param clientFee Amount of client fee in reward token
  function _sendFeeToBountyCollector(
    uint256 treasuryFee,
    address clientAccount,
    uint256 clientFee
  ) internal {
    router.swapExactTokensForTokens(
      treasuryFee.add(clientFee),
      0,
      rewardToFeePath,
      address(this),
      block.timestamp
    );

    uint256 baseTokenBalance = baseToken.myBalance();

    baseToken.safeTransfer(address(bountyCollector), baseTokenBalance);

    uint256 amountForClient;
    if (clientAccount != address(0)) {
      amountForClient = baseTokenBalance.mul(clientFee).div(clientFee.add(treasuryFee));
      bountyCollector.registerBounty(clientAccount, amountForClient);
    }

    emit SendFeeToBountyCollector(
      clientAccount,
      amountForClient,
      baseTokenBalance.sub(amountForClient)
    );
  }
}
