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

  /// @dev It's emitted when reward will be collected
  /// @param caller Address which call collect function
  /// @param rewardOwner Address of reward owner
  /// @param reward Amount of collected reward
  event RewardCollect(address indexed caller, address indexed rewardOwner, uint256 indexed reward);

  /// @dev It's emitted when worker will register new harvested rewards
  /// @param caller Address of worker which will register rewards
  /// @param pids Array of position ids
  /// @param amounts Array of reward amounts assign to the specific positions
  /// @notice The order of values in the amounts array is related to the order in the pids array
  event RewardsRegister(address indexed caller, uint256[] indexed pids, uint256[] indexed amounts);

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
  mapping(uint256 => uint256) public rewards;
  mapping(address => bool) public okRewardAssigners;

  modifier onlyWhitelistedRewardAssigners() {
    require(okRewardAssigners[msg.sender], "Vault: Reward assigner not whitelisted");
    _;
  }

  modifier onlyClientContract() {
    require(protocolManager.approvedClients(msg.sender), "Vault: not client contract");
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
  function positionInfo(uint256 id) external view returns (uint256) {
    Position storage pos = positions[id];
    // TODO: Uwzględnić również zarobione rewardsy - fee
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
  /// @param id The ID of the position to unlock the earning. Use ZERO for new position.
  /// @param worker The address of the authorized worker to work for this position.
  /// @param amount The anout of Token to supply by user.
  /// @param data The calldata to pass along to the worker for more working context.
  function work(
    uint256 id,
    address worker,
    uint256 amount,
    address endUser,
    bytes calldata data
  ) external payable override onlyClientContract transferTokenToVault(amount) nonReentrant {
    // 1. Sanity check the input position, or add a new position of ID is 0.
    Position storage pos;
    if (id == 0) {
      id = nextPositionID++;
      pos = positions[id];
      pos.worker = worker;
      pos.owner = endUser;
      pos.client = msg.sender;
    } else {
      pos = positions[id];
      require(id < nextPositionID, "bad position id");
      require(pos.worker == worker, "bad position worker");
      require(pos.owner == endUser, "not position owner");
      require(pos.client == msg.sender, "bad source-client address");
    }
    // Update execution scope variables
    POSITION_ID = id;
    (STRATEGY, ) = abi.decode(data, (address, bytes));

    emit Work(id, worker, amount, STRATEGY);

    require(amount <= SafeToken.myBalance(token), "insufficient funds in the vault");

    SafeToken.safeTransfer(token, worker, amount);
    IWorker(worker).work(id, data);
    // 5. Release execution scope
    POSITION_ID = _NO_ID;
    STRATEGY = _NO_ADDRESS;
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

    require(length == amounts.length, "Vault: invalid input data");

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

      // Transfer assets to fee collector and register the amounts
      feeCollector.registerFees(addresses, fees);
      token.safeTransfer(address(feeCollector), feeSum);

      // Assign final reward to the user
      rewards[pid] = rewards[pid].add(userReward);
    }

    emit RewardsRegister(msg.sender, pids, amounts);
  }

  /// @dev Collect accumulated rewards
  /// @param pid Position ID
  function collectReward(uint256 pid) external override {
    Position memory position = positions[pid];

    uint256 reward = rewards[pid];

    require(
      (reward * 10000) / 10000 == reward,
      "Vault: Too little amount to collect (precision loss)"
    );
    // Finally transfer assets to the end user
    token.safeTransfer(position.owner, reward);

    // Emit
    emit RewardCollect(msg.sender, position.owner, reward);
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

  /// @dev Fallback function to accept BNB.
  receive() external payable {}
}
