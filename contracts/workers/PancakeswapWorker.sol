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
import "../interfaces/IProtocolManager.sol";

/// @dev Contract responsible for Pancakeswap liquidity pool handling.
/// Allows execute specific strategies to add, remove liquidity and harvesting rewards.
contract PancakeswapWorker is OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe, IWorker {
  /// @notice Libraries
  using SafeToken for address;
  using SafeMath for uint256;

  /// @dev It's emitted when the rewards is harvesting
  /// @param reward Amount of the harvested CAKE token
  /// @param rewardInBaseToken Amount of the reward converted to base token
  /// @param operatingVault Address of the operating vault
  event Harvest(uint256 reward, uint256 rewardInBaseToken, address indexed operatingVault);

  /// @dev It's emitted during staking LP tokens to the given position
  /// @param id Position id
  /// @param share Number of shares for the given position
  event AddShare(uint256 indexed id, uint256 share);

  /// @dev It's emitted during unstaking LP tokens from the given position
  /// @param id Position id
  /// @param share Number of removed share
  event RemoveShare(uint256 indexed id, uint256 share);

  /// @dev It's emitted when the harvest configuration will be changed
  /// @param caller Address which set the new configuration
  /// @param harvestThreshold Threshold for harvesting in CAKE
  /// @param harvestPath Array of token addresses as path to swap CAKE token to base token
  event SetHarvestConfig(address indexed caller, uint256 harvestThreshold, address[] harvestPath);

  /// @dev It's emitted when harvester approval will be changed
  /// @param caller Address which change the harvester approval
  /// @param harvester Address of harvester
  /// @param isApprove Whether is approved or unapproved
  event SetHarvesterApproval(
    address indexed caller,
    address indexed harvester,
    bool indexed isApprove
  );

  /// @dev It's emitted when treasury fee will be changed
  /// @param caller Address which change the treasury fee
  /// @param feeBps Fee in BPS
  event SetTreasuryFee(address indexed caller, uint256 feeBps);

  /// @dev It's emitted when client fee will be changed
  /// @param caller Address of client's smart contract
  /// @param feeBps Fee in BPS
  event SetClientFee(address indexed caller, uint256 feeBps);

  /// @dev It's emitted when strategies' addresses will be updated
  /// @param strategies Array of updated addresses
  /// @param caller Address which updated strategies' addresses
  /// [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, Liquidate]
  event SetStrategies(address[] strategies, address indexed caller);

  /// @dev It's emitted when Vault will execute strategy on the worker
  /// @param operatingVault Address of operating vault
  /// @param positionId Id of position
  /// @param strategy Address of executed strategy
  /// @param stratParams Encoded params for strategy
  event Work(
    address indexed operatingVault,
    uint256 positionId,
    address strategy,
    bytes stratParams
  );

  /// @notice Configuration variables
  IPancakeFactory public factory;
  IPancakeMasterChef public masterChef;
  IPancakeRouterV2 public router;
  address public override lpToken;
  address public wNative;
  string name;
  address public override baseToken;
  address public override token0;
  address public override token1;
  address public cake;
  address public override operatingVault;
  uint256 public pid;
  IProtocolManager protocolManager;
  /// @notice Configuration variables for PancakeswapV2
  uint256 public fee;
  uint256 public feeDenom;

  /// @notice Configuration variables for harvesting
  uint256 public harvestThreshold;
  address[] public harvestPath;

  /// @notice [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, Liquidate]
  address[] private strategies;
  mapping(address => bool) private approvedStrategies;

  /// @notice Mutable state variables
  mapping(uint256 => uint256) public shares;
  uint256 public totalShare;
  uint256[] private positionIds;
  uint256 public override treasuryFeeBps;
  bool private isEnabled;
  mapping(address => uint256) public clientFeesBps;
  mapping(address => bool) public okHarvesters;

  function initialize(
    string calldata _name,
    address _operatingVault,
    address _baseToken,
    IPancakeMasterChef _masterChef,
    IPancakeRouterV2 _router,
    uint256 _pid,
    address[] calldata _harvestPath,
    uint256 _harvestThreshold,
    uint256 _treasuryFeeBps,
    IProtocolManager _protocolManager
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
    protocolManager = _protocolManager;

    // 3. Assign tokens state variables
    name = _name;
    baseToken = _baseToken;
    pid = _pid;
    (IERC20 _lpToken, , , ) = masterChef.poolInfo(_pid);
    lpToken = address(_lpToken);
    token0 = IPancakePair(lpToken).token0();
    token1 = IPancakePair(lpToken).token1();
    cake = address(masterChef.cake());
    isEnabled = true;

    // 5. Assign Re-invest parameters
    treasuryFeeBps = _treasuryFeeBps;
    harvestThreshold = _harvestThreshold;
    harvestPath = _harvestPath;

    // 6. Set PancakeswapV2 swap fees
    fee = 9975;
    feeDenom = 10000;

    // 7. Check if critical parameters are config properly
    require(
      baseToken != cake,
      "PancakeswapWorker->initialize: base token cannot be a reward token"
    );
    require(
      _harvestPath.length >= 2,
      "PancakeswapWorker->setHarvestConfig: _harvestPath length must >= 2"
    );
    require(
      _harvestPath[0] == cake && _harvestPath[_harvestPath.length - 1] == baseToken,
      "PancakeswapWorker->setHarvestConfig: _harvestPath must start with CAKE, end with baseToken"
    );
  }

  /// @dev Require that the caller must be the operatingVault.
  modifier onlyOperatingVault() {
    require(
      msg.sender == operatingVault,
      "PancakeswapWorker->onlyOperatingVault: not operatingVault"
    );
    _;
  }

  modifier onlyAdminContract() {
    require(
      protocolManager.isAdminContract(msg.sender),
      "PancakeswapWorker->onlyAdminContract: not admin contract"
    );
    _;
  }

  //// @dev Require that the caller must be ok harvester.
  modifier onlyHarvester() {
    require(
      protocolManager.approvedHarvesters(msg.sender),
      "PancakeswapWorker->onlyHarvester: not harvester"
    );
    _;
  }

  modifier onlyClientContract() {
    require(
      protocolManager.approvedClients(msg.sender),
      "PancakeswapWorker->onlyClientContract: not client contract"
    );
    _;
  }

  /// @dev Return the entitied LP token balance for the given shares.
  /// @param share The number of shares to be converted to LP balance.
  /// @return uint256 LP token balance
  function shareToBalance(uint256 share) public view returns (uint256) {
    if (totalShare == 0) return share; // When there's no share, 1 share = 1 balance.
    (uint256 totalBalance, ) = masterChef.userInfo(pid, address(this));
    return share.mul(totalBalance).div(totalShare);
  }

  /// @dev Return the number of shares to receive if staking the given LP tokens.
  /// @param balance the number of LP tokens to be converted to shares.
  /// @return uint256 Number of shares
  function balanceToShare(uint256 balance) public view returns (uint256) {
    if (totalShare == 0) return balance; // When there's no share, 1 share = 1 balance.
    (uint256 totalBalance, ) = masterChef.userInfo(pid, address(this));
    return balance.mul(totalShare).div(totalBalance);
  }

  /// @dev Harvest reward tokens, swap them on base token and send to the Vault.
  /// @notice Must be called by approved harvester bot
  function harvestRewards() external override onlyHarvester nonReentrant {
    // 1. Withdraw all the rewards. Return if reward <= _harvestThreshold.
    masterChef.withdraw(pid, 0);
    uint256 reward = cake.balanceOf(address(this));

    if (reward <= harvestThreshold) return;

    // 2. Approve tokens
    cake.safeApprove(address(router), uint256(-1));

    // 3. Convert all rewards to BaseToken according to config path.
    router.swapExactTokensForTokens(reward, 0, getHarvestPath(), address(this), block.timestamp);

    // 4. Send all base token to the operatingVault
    uint256 baseTokenBalance = baseToken.myBalance();

    baseToken.safeTransfer(operatingVault, baseTokenBalance);

    // 5. Calculate the amount of reward for the given positions
    uint256 numberOfPositions = positionIds.length;

    uint256[] memory rewardsPerPosition = new uint256[](numberOfPositions);

    for (uint256 i = 0; i < numberOfPositions; i++) {
      uint256 positionShare = shares[positionIds[i]];
      rewardsPerPosition[i] = baseTokenBalance.mul(positionShare).div(totalShare);
    }

    // 6. Register rewards
    IVault(operatingVault).registerRewards(positionIds, rewardsPerPosition);

    // 7. Reset approval
    cake.safeApprove(address(router), 0);

    emit Harvest(reward, baseTokenBalance, operatingVault);
  }

  /// @dev Work on the given position. Must be called by the operatingVault.
  /// @param positionId The position ID to work on.
  /// @param data The encoded data, consisting of strategy address and strategy params.
  function work(uint256 positionId, bytes calldata data)
    external
    override
    onlyOperatingVault
    nonReentrant
    returns (uint256)
  {
    (address strategy, bytes memory stratParams) = abi.decode(data, (address, bytes));

    // Revert transaction when farm is disabled and strategy to add liquidity is used
    if (!isEnabled && (strategy == strategies[0] || strategy == strategies[1])) {
      revert("PancakeswapWorker->work: given farm is disabled");
    }

    addPositionId(positionId);
    // 1. Convert this position back to LP tokens.
    _removeShare(positionId);
    // 2. Transfer funds and perform the worker strategy.
    require(approvedStrategies[strategy], "PancakeswapWorker->work: unapproved work strategy");
    require(
      IPancakePair(lpToken).transfer(strategy, IPancakePair(lpToken).balanceOf(address(this))),
      "PancakeswapWorker->work: unable to transfer lp to strategy"
    );

    baseToken.safeTransfer(strategy, baseToken.myBalance());

    uint256 amount_to_receive = IStrategy(strategy).execute(stratParams);

    // 3. Add LP tokens back to the farming pool.
    _addShare(positionId);
    // 4. Return any remaining BaseToken back to the operatingVault.
    baseToken.safeTransfer(msg.sender, baseToken.myBalance());

    emit Work(operatingVault, positionId, strategy, stratParams);
    return amount_to_receive;
  }

  /// @dev Return the amount of BaseToken to receive if we are to liquidate the given position.
  /// @param id The position ID.
  function tokensToReceive(uint256 id) external view override returns (uint256) {
    // 1. Get the position's LP balance and LP total supply.
    uint256 lpBalance = shareToBalance(shares[id]);
    uint256 lpSupply = IPancakePair(lpToken).totalSupply(); // Ignore pending mintFee as it is insignificant
    // 2. Get the reserves of token0 and token1 in the pool
    (uint256 r0, uint256 r1, ) = IPancakePair(lpToken).getReserves();
    (uint256 totalToken0, uint256 totalToken1) = IPancakePair(lpToken).token0() == token0 ? (r0, r1) : (r1, r0);
    // 3. Convert the position's LP tokens to the underlying assets.
    uint256 userToken0 = lpBalance.mul(totalToken0).div(lpSupply);
    uint256 userToken1 = lpBalance.mul(totalToken1).div(lpSupply);
    // 4. Estimate and return amount of base token to receive
    if (token0 == baseToken) {
      return _estimateSwapOutput(token1, baseToken, userToken1).add(userToken0);
    }

    if (token1 == baseToken) {
      return _estimateSwapOutput(token0, baseToken, userToken0).add(userToken1);
    }

    return
      _estimateSwapOutput(token0, baseToken, userToken0).add(
        _estimateSwapOutput(token1, baseToken, userToken1)
      );
  }

  /// Internal function to estimate swap result on pancakeswap router
  function _estimateSwapOutput(
    address tokenIn,
    address tokenOut,
    uint256 amountIn
  ) internal view returns (uint256) {
    if (amountIn <= 0) {
      return 0;
    }

    address[] memory path = _getBestPath(amountIn, tokenIn, tokenOut);

    return _getBestAmount(path, amountIn);
  }

  /// Internal function to stake all outstanding LP tokens to the given position ID.
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

  /// Internal function to remove shares of the ID and convert to outstanding LP tokens.
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

    emit SetStrategies(supportedStrategies, msg.sender);
  }

  /// @dev Get addresses of the supported strategies
  /// @return Array of strategies: [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, Liquidate]
  function getStrategies() external view override returns (address[] memory) {
    return strategies;
  }

  /// @dev Function to get harvest path. Return route through WBNB if harvestPath not set.
  /// @return address[] Array of tokens' addresses which create harvest path
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

  /// @dev Returns worker's name
  /// @return string worker's name
  function getName() public view override returns (string memory) {
    return name;
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
      "PancakeswapWorker->setHarvestConfig: _harvestPath length must >= 2"
    );
    require(
      _harvestPath[0] == cake && _harvestPath[_harvestPath.length - 1] == baseToken,
      "PancakeswapWorker->setHarvestConfig: _harvestPath must start with CAKE, end with baseToken"
    );

    harvestThreshold = _harvestThreshold;
    harvestPath = _harvestPath;

    emit SetHarvestConfig(msg.sender, _harvestThreshold, _harvestPath);
  }

  /// @dev Set treasury fee.
  /// @param _treasuryFeeBps - The fee in BPS that will be charged
  function setTreasuryFee(uint256 _treasuryFeeBps) external override onlyAdminContract {
    treasuryFeeBps = _treasuryFeeBps;

    emit SetTreasuryFee(msg.sender, _treasuryFeeBps);
  }

  /// @dev Get fee in bps for given client
  /// @param clientAccount address of client account
  function getClientFee(address clientAccount) external view override returns (uint256) {
    return clientFeesBps[clientAccount];
  }

  /// @dev Set fee in bps for specific client
  /// @param clientFeeBps The fee in BPS
  function setClientFee(uint256 clientFeeBps) external override onlyClientContract {
    clientFeesBps[msg.sender] = clientFeeBps;

    emit SetClientFee(msg.sender, clientFeeBps);
  }

  /// @dev Function to set worker as enabled or disabled
  /// @param _isEnable Whether worker will be enable or disable
  function toggleWorker(bool _isEnable) external override onlyAdminContract {
    isEnabled = _isEnable;
  }

  function isWorkerEnabled() external view override returns (bool) {
    return isEnabled;
  }

  /// Internal function to add new position id to the array with position ids
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

  function getRewardToken() external view override returns (address) {
    return cake;
  }

  /// @dev harvestRewards equivalent without ACL and payout checks.
  /// @notice Can be called by valid vault only.
  /// @notice Emergency function - takes place only during emergency withdrawal triggered by AdminContract
  function forceHarvest() external override nonReentrant onlyOperatingVault {
    // 1. Withdraw all the rewards.
    masterChef.withdraw(pid, 0);
    uint256 reward = cake.balanceOf(address(this));

    // 2. Approve tokens
    cake.safeApprove(address(router), uint256(-1));

    // 3. Convert all rewards to BaseToken according to config path.
    router.swapExactTokensForTokens(reward, 0, getHarvestPath(), address(this), block.timestamp);

    // 4. Send all base token to the operatingVault
    uint256 baseTokenBalance = baseToken.myBalance();

    baseToken.safeTransfer(operatingVault, baseTokenBalance);

    // 5. Calculate the amount of reward for the given positions
    uint256 numberOfPositions = positionIds.length;

    uint256[] memory rewardsPerPosition = new uint256[](numberOfPositions);

    for (uint256 i = 0; i < numberOfPositions; i++) {
      uint256 positionShare = shares[positionIds[i]];
      rewardsPerPosition[i] = baseTokenBalance.mul(positionShare).div(totalShare);
    }

    // 6. Register rewards
    IVault(operatingVault).registerRewards(positionIds, rewardsPerPosition);

    // 7. Reset approval
    cake.safeApprove(address(router), 0);

    emit Harvest(reward, baseTokenBalance, operatingVault);
  }

  /// @dev Withdraw all position funds
  /// @param positionId The position ID to perform emergency withdrawal on.
  /// @param positionOwner address to transfer liquidated assets to
  function emergencyWithdraw(uint256 positionId, address positionOwner)
    external
    override
    onlyOperatingVault
    nonReentrant
  {
    address liquidation = this.getStrategies()[2];

    addPositionId(positionId);
    // 1. Convert this position back to LP tokens.
    _removeShare(positionId);
    // 2. Transfer funds and perform the worker strategy.
    require(
      IPancakePair(lpToken).transfer(liquidation, lpToken.balanceOf(address(this))),
      "PancakeswapWorker->emergencyWithdraw: unable to transfer lp to strategy"
    );

    bytes memory data = abi.encode(
      this.baseToken(),
      this.token1(),
      this.token0(),
      0,
      positionOwner
    );

    baseToken.safeTransfer(liquidation, baseToken.myBalance());
    IStrategy(liquidation).execute(data);
    // 3. Add LP tokens back to the farming pool.
    _addShare(positionId);
    // 4. Return any remaining BaseToken back to the operatingVault.
    baseToken.safeTransfer(msg.sender, baseToken.myBalance());
  }

  function _getBestPath(
    uint256 amountIn,
    address _token0,
    address _token1
  ) internal view returns (address[] memory) {
    address[] memory stables = protocolManager.getStables();

    uint256 l = stables.length;

    address[] memory bestPath = new address[](3);

    (uint256 reserveIn, uint256 reserveOut) = PancakeLibraryV2.getReserves(
      address(factory),
      _token0,
      _token1
    );

    uint256 bestAmountOut = PancakeLibraryV2.getAmountOut(amountIn, reserveIn, reserveOut);
    bestPath[0] = _token0;
    bestPath[1] = _token1;

    for (uint8 i = 0; i < l; i++) {
      address[] memory path = new address[](3);

      address stable = stables[i];

      if (_token0 != stable && _token1 != stable && hopsValid(_token0, stable, _token1)) {
        path[0] = _token0;
        path[1] = stable;
        path[2] = _token1;

        uint256[] memory tempAmountOut = PancakeLibraryV2.getAmountsOut(
          address(factory),
          amountIn,
          path
        );

        if (tempAmountOut[2] > bestAmountOut) {
          bestAmountOut = tempAmountOut[2];

          bestPath[0] = _token0;
          bestPath[1] = stable;
          bestPath[2] = _token1;
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

  function hopsValid(
    address _token0,
    address stable,
    address _token1
  ) internal view returns (bool) {
    bool firstHopValid = factory.getPair(_token0, stable) != address(0);
    bool secondHopValid = factory.getPair(stable, _token1) != address(0);

    return firstHopValid && secondHopValid;
  }
}
