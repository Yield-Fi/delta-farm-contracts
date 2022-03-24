// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/Math.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import "./interfaces/IWorker.sol";
import "./interfaces/IFeeCollector.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IVaultConfig.sol";
import "./interfaces/IWBNB.sol";
import "./interfaces/IWrappedNativeTokenRelayer.sol";
import "./interfaces/IProtocolManager.sol";
import "./utils/SafeToken.sol";

contract Vault is IVault, Initializable, OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe {
  /// @notice Libraries
  using SafeToken for address;
  using SafeMath for uint256;

  /// @dev It's emitted when client contract perform deposit or withdraw action
  /// @param id Index of position to perform action on
  /// @param worker The address of the authorized worker to work for this position.
  /// @param amount Amount of base token to supply or withdraw
  /// @param strategy Address of the strategy to execute by worker
  event Work(uint256 indexed id, address worker, uint256 amount, address strategy);

  /// @dev Event is emitted when Claim/Harvest function will be called
  /// @param recipient Address for which protocol should reduce old position, rewards are sent separately
  /// @param client Address of client end user comes from
  /// @param farm Address of target farm
  /// @param amount Amount of vault operating token (asset) user is going to harvest from protocol .
  event CollectReward(
    address indexed recipient,
    address client,
    address indexed farm,
    uint256 indexed amount
  );

  /// @dev It's emitted when worker will register new harvested rewards
  /// @param caller Address of worker which will register rewards
  /// @param pids Array of position ids
  /// @param amounts Array of reward amounts assign to the specific positions
  /// @notice The order of values in the amounts array is related to the order in the pids array
  event RewardsRegister(address indexed caller, uint256[] pids, uint256[] amounts);

  /// @dev It's emitted when worker will register new harvested rewards
  /// @param worker Address of worker which will register rewards
  /// @param yieldFiCut Amount of fee yield fi has taken
  /// @param clientCut Amount of fee client has taken
  /// @param client client address end-user opened position from
  event FeesRegister(address indexed worker, uint256 yieldFiCut, uint256 clientCut, address client);

  /// @dev Flags for manage execution scope
  uint256 private constant _NOT_ENTERED = 1;
  uint256 private constant _ENTERED = 2;
  uint256 private constant _NO_ID = uint256(-1);
  address private constant _NO_ADDRESS = address(1);

  /// @dev Temporay variables to manage execution scope
  uint256 public _IN_EXEC_LOCK;
  uint256 public POSITION_ID;
  address public STRATEGY;

  /// @dev Attributes for Vault
  /// token - address of the token to be deposited in this pool
  address public override token;

  struct Position {
    address worker;
    address owner;
    address client;
  }

  IVaultConfig public config;
  mapping(uint256 => Position) public positions;
  uint256 public nextPositionID;

  /// Reward-related stuff
  IFeeCollector public feeCollector;

  IProtocolManager public protocolManager;

  /// @dev Position ID => Native Token Amount
  mapping(uint256 => uint256) public override rewards;
  mapping(address => bool) public override approvedRewardAssigners;

  mapping(uint256 => uint256) public totalRewards;

  modifier onlyWhitelistedRewardAssigners() {
    require(protocolManager.approvedWorkers(msg.sender), "Vault: not approved worker contract");
    _;
  }

  modifier onlyClientContract() {
    require(protocolManager.approvedClients(msg.sender), "Vault: not client contract");
    _;
  }

  modifier onlyAdminContract() {
    require(protocolManager.isAdminContract(msg.sender), "Vault: Only admin contract");
    _;
  }

  /// @dev Get token from msg.sender
  modifier transferTokenToVault(uint256 value) {
    if (msg.value != 0) {
      require(token == config.wrappedNativeToken(), "baseToken is not wNative");
      require(value == msg.value, "value != msg.value");
      IWBNB(config.wrappedNativeToken()).deposit{ value: msg.value }();
    } else {
      SafeToken.safeTransferFrom(token, msg.sender, address(this), value);
    }
    _;
  }

  /// @dev Ensure that the function is called with the execution scope
  modifier inExec() {
    require(POSITION_ID != _NO_ID, "not within execution scope");
    require(STRATEGY == msg.sender, "not from the strategy");
    require(_IN_EXEC_LOCK == _NOT_ENTERED, "in exec lock");
    _IN_EXEC_LOCK = _ENTERED;
    _;
    _IN_EXEC_LOCK = _NOT_ENTERED;
  }

  /// @dev Function to initialize new contarct instance
  /// @param _config Address of VaultConfig contract
  /// @param _token Address of token which will be the base token for this vault
  /// @param _protocolManager Address of protocol manager contract
  /// @param _feeCollector Address of fee collector contract
  function initialize(
    IVaultConfig _config,
    address _token,
    IProtocolManager _protocolManager,
    IFeeCollector _feeCollector
  ) external initializer {
    __Ownable_init();
    __ReentrancyGuard_init();

    nextPositionID = 1;
    config = _config;
    token = _token;
    feeCollector = _feeCollector;
    protocolManager = _protocolManager;

    // free-up execution scope
    _IN_EXEC_LOCK = _NOT_ENTERED;
    POSITION_ID = _NO_ID;
    STRATEGY = _NO_ADDRESS;
  }

  /// @dev Return Token value of the given position.
  /// @param id The position ID to query.
  function positionInfo(uint256 id) external view override returns (uint256) {
    Position storage pos = positions[id];
    return (IWorker(pos.worker).tokensToReceive(id));
  }

  /// @dev Return the total token entitled to the token holders
  function totalToken() public view override returns (uint256) {
    return SafeToken.myBalance(token);
  }

  /// @dev Request Funds from user through Vault
  /// @param targetedToken Address of requested token
  /// @param amount requested amount
  /// @notice Function can be called only by strategy
  function requestFunds(address targetedToken, uint256 amount) external override inExec {
    SafeToken.safeTransferFrom(targetedToken, positions[POSITION_ID].owner, msg.sender, amount);
  }

  /// Transfer to "to". Automatically unwrap if BTOKEN is WBNB
  /// @param to The address of the receiver
  /// @param amount The amount to be withdrawn
  function _safeUnwrap(address to, uint256 amount) internal {
    if (token == config.wrappedNativeToken()) {
      SafeToken.safeTransfer(token, config.wrappedNativeTokenRelayer(), amount);
      IWrappedNativeTokenRelayer(config.wrappedNativeTokenRelayer()).withdraw(amount);
      SafeToken.safeTransferETH(to, amount);
    } else {
      SafeToken.safeTransfer(token, to, amount);
    }
  }

  /// @dev Create a new farming position to unlock your yield farming potential.
  /// @param positionId The ID of the position to unlock the earning. Use ZERO for new position.
  /// @param worker The address of the authorized worker to work for this position.
  /// @param amount The anout of Token to supply by user.
  /// @param data The calldata to pass along to the worker for more working context.
  function work(
    uint256 positionId,
    address worker,
    uint256 amount,
    address recipient,
    bytes calldata data
  ) external payable override onlyClientContract transferTokenToVault(amount) nonReentrant returns(uint256){
    // 1. Sanity check the input position, or add a new position of ID is 0.
    Position storage pos;
    if (positionId == 0) {
      positionId = nextPositionID++;
      pos = positions[positionId];
      pos.worker = worker;
      pos.owner = recipient;
      pos.client = msg.sender;
    } else {
      pos = positions[positionId];
      require(positionId < nextPositionID, "bad position id");
      require(pos.worker == worker, "bad position worker");
      require(pos.owner == recipient, "not position owner");
      require(pos.client == msg.sender, "bad source-client address");
    }
    // Update execution scope variables
    POSITION_ID = positionId;
    (STRATEGY, ) = abi.decode(data, (address, bytes));

    emit Work(positionId, worker, amount, STRATEGY);

    require(amount <= SafeToken.myBalance(token), "insufficient funds in the vault");

    SafeToken.safeTransfer(token, worker, amount);
    uint256 amounnt_to_recieve = IWorker(worker).work(positionId, data);
    // 5. Release execution scope
    POSITION_ID = _NO_ID;
    STRATEGY = _NO_ADDRESS;
    return amounnt_to_recieve;
  }

  /// @dev Update bank configuration to a new address. Must only be called by owner.
  /// @param _config The new configurator address.
  function updateConfig(IVaultConfig _config) external onlyOwner {
    config = _config;
  }

  /// @dev Withdraw BaseToken reserve for underwater positions to the given address.
  /// @param to The address to transfer BaseToken to.
  /// @param value The number of BaseToken tokens to withdraw. Must not exceed `reservePool`.
  function withdrawReserve(address to, uint256 value) external onlyOwner nonReentrant {
    SafeToken.safeTransfer(token, to, value);
  }

  /// @dev Function to register new rewards
  /// @param pids Array of position ids
  /// @param amounts Array of reward amounts assign to the specific positions
  /// @notice The order of values in the amounts array is related to the order in the pids array
  /// @notice Function can be called only by worker
  function registerRewards(uint256[] calldata pids, uint256[] calldata amounts)
    external
    override
    onlyWhitelistedRewardAssigners
  {
    uint256 length = pids.length;
    uint256[] memory userAmounts = new uint256[](amounts.length);

    require(length == amounts.length, "Vault: invalid input data");

    uint256 singleTxAcc = 0;

    for (uint256 i = 0; i < length; i++) {
      uint256 pid = pids[i];
      uint256 baseReward = amounts[i];

      Position memory position = positions[pid];

      IWorker worker = IWorker(position.worker);

      uint256 yieldFiBps = worker.treasuryFeeBps();
      uint256 clientBps = worker.getClientFee(position.client);

      // Fee amounts
      uint256 yieldFiFee = baseReward.mul(yieldFiBps).div(10000);
      uint256 clientFee = baseReward.mul(clientBps).div(10000);
      uint256 feeSum = yieldFiFee.add(clientFee);

      // Part of reward that user will receive
      uint256 userReward = baseReward.sub(feeSum);

      // Static array to dynamic array cast
      uint256[] memory fees = new uint256[](2);
      address[] memory addresses = new address[](2);

      fees[0] = yieldFiFee;
      fees[1] = clientFee;

      addresses[0] = config.treasuryAccount();
      addresses[1] = positions[pid].client;

      // Transfer assets to bounty collector and register the amounts
      feeCollector.registerFees(addresses, fees);
      singleTxAcc = singleTxAcc.add(feeSum);

      // Assign final reward to the user
      rewards[pid] = rewards[pid].add(userReward);
      totalRewards[pid] = totalRewards[pid].add(userReward);

      userAmounts[i] = userReward;

      // Index event
      emit FeesRegister(position.worker, yieldFiFee, clientFee, position.client);
    }

    token.safeTransfer(address(feeCollector), singleTxAcc);

    emit RewardsRegister(msg.sender, pids, userAmounts);
  }

  /// @dev Collect accumulated rewards
  /// @param pid Position ID
  /// @param recipient Recipient address - must match recipient address given during position opening
  function collectReward(uint256 pid, address recipient) external override onlyClientContract {
    Position memory position = positions[pid];

    uint256 reward = rewards[pid];

    // Take precision loss into account
    require(
      (reward * 10000) / 10000 == reward,
      "Vault: Too little amount to collect (precision loss) or invalid position ID"
    );

    // Some kind of safety feature to make sure only valid pid-recipient combination will trigger the collect
    require(position.owner == recipient, "Vault: Invalid recipient provided");

    // Finally transfer assets to the end user
    token.safeTransfer(position.owner, reward);

    rewards[pid] = 0;
  }

  /// @dev Function to collect all rewards from each position of given owner
  /// @param owner owner of positions
  function collectAllRewards(address owner) external override onlyClientContract {
    uint256 rewardAmount = 0;

    for (uint256 i = 1; i < nextPositionID; i++) {
      if (positions[i].owner == owner && positions[i].client == msg.sender) {
        rewardAmount = rewardAmount.add(rewards[i]);

        // Index event
        emit CollectReward(owner, positions[i].client, positions[i].worker, rewards[i]);

        rewards[i] = 0;
      }
    }

    token.safeTransfer(owner, rewardAmount);
  }

  /// @dev Function returns amount of all rewards from owner's positions
  /// @param owner Owner of positions
  /// @return uint256 Amount of rewards
  function rewardsToCollect(address owner) external view override returns (uint256) {
    uint256 rewardAmount = 0;

    for (uint256 i = 1; i < nextPositionID; i++) {
      if (positions[i].owner == owner && positions[i].client == msg.sender) {
        rewardAmount = rewardAmount.add(rewards[i]);
      }
    }

    return rewardAmount;
  }

  /// @dev Contract health component
  /// @notice Check if contract is able to payout all the rewards on demand
  /// @return bool - true if amount of operating token is greater than or equal to total rewards value, false if not
  function checkRewardsToBalanceStability() external view returns (bool) {
    uint256 acc = 0;

    for (uint256 i = 1; i < nextPositionID - 1; i++) {
      acc += rewards[i];
    }

    return acc >= token.balanceOf(address(this));
  }

  /// @dev Get all listed positions in the Vault
  /// @return set of marked arrays
  /// @notice Return Type: [pids], [workers], [owners], [clients];
  /// @notice Return composition: pos<Position>{pid: pids[i], worker: workers[i] owner: owners[i], client: clients[i]}
  /// @notice Due to solidity flavours:
  /// @notice slot [0] will be occupied using zeroed values (address(0) for addresses and uint256(0) for numbers)
  function getAllPositions(uint256 fromPid)
    external
    view
    override
    returns (
      uint256[] memory,
      address[] memory,
      address[] memory,
      address[] memory
    )
  {
    uint256 itemsAmount = nextPositionID - fromPid;

    uint256[] memory _pids = new uint256[](itemsAmount);
    address[] memory _workers = new address[](itemsAmount);
    address[] memory _owners = new address[](itemsAmount);
    address[] memory _clients = new address[](itemsAmount);

    for (uint256 i = 0; i < itemsAmount; i++) {
      Position memory pos = positions[fromPid];

      _pids[i] = fromPid;
      _workers[i] = pos.worker;
      _owners[i] = pos.owner;
      _clients[i] = pos.client;

      fromPid++;
    }

    return (_pids, _workers, _owners, _clients);
  }

  /// @dev Get all listed rewards in the Vault
  /// @return set of marked arrays
  /// @notice Return Type: [pids], [rewards]
  /// @notice Return composition: rew<Reward>{pid: pids[i], reward: rewards[i], totalReward: totalRewards[i]}
  /// @notice Due to solidity flavours:
  /// @notice slot [0] will be occupied using zeroed values (uint256(0) for numbers)
  function getAllRewards(uint256 fromPid)
    external
    view
    override
    returns (
      uint256[] memory,
      uint256[] memory,
      uint256[] memory
    )
  {
    uint256 itemsAmount = nextPositionID - fromPid;

    uint256[] memory _pids = new uint256[](itemsAmount);
    uint256[] memory _rewards = new uint256[](itemsAmount);
    uint256[] memory _totalRewards = new uint256[](itemsAmount);

    for (uint256 i = 0; i < itemsAmount; i++) {
      _pids[i] = fromPid;
      _rewards[i] = rewards[fromPid];
      _totalRewards[i] = totalRewards[fromPid];

      fromPid++;
    }

    return (_pids, _rewards, _totalRewards);
  }

  /// @dev Fallback function to accept BNB.
  receive() external payable {}

  /// @dev Returns id of position
  /// @param owner Position's owner
  /// @param worker Position's worker (farm) address
  /// @param client Position's client
  /// @return uint256 Id of position, returns 0 when position with given params isn't exist
  function getPositionId(
    address owner,
    address worker,
    address client
  ) external view override returns (uint256) {
    for (uint256 i = 1; i < nextPositionID; i++) {
      if (
        positions[i].owner == owner &&
        positions[i].worker == worker &&
        positions[i].client == client
      ) {
        return i;
      }
    }

    return 0;
  }

  /// @dev Perform emergency withdrawal on given worker
  /// @param _worker address of the worker to perform emergency withdraw on
  function emergencyWithdraw(address _worker) external override onlyAdminContract {
    for (uint256 i = 1; i < nextPositionID; i++) {
      if (positions[i].worker == _worker) {
        IWorker worker = IWorker(_worker);
        // Force harvest from farming protocol & reward distribution
        worker.forceHarvest();

        // Withdraw given position from given worker and transfer asset to given address - position owner in this case
        worker.emergencyWithdraw(i, positions[i].owner);

        // Some rewards may remain unclaimed after harvesting - transfer them to.
        uint256 reward = rewards[i];

        token.safeTransfer(positions[i].owner, reward);

        // Null-out remaining rewards
        rewards[i] = 0;
      }
    }
  }
}
