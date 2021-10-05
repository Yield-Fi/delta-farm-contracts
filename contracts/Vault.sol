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
import "./interfaces/IBountyCollector.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IVaultConfig.sol";
import "./interfaces/IWBNB.sol";
import "./interfaces/IWNativeRelayer.sol";
import "./utils/SafeToken.sol";

contract Vault is
  IVault,
  Initializable,
  OwnableUpgradeSafe,
  ERC20UpgradeSafe,
  ReentrancyGuardUpgradeSafe
{
  /// @notice Libraries
  using SafeToken for address;
  using SafeMath for uint256;

  /// @notice Events
  event Work(uint256 indexed id, uint256 loan);
  event RewardCollect(address indexed caller, address indexed rewardOwner, uint256 indexed reward);

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
  IBountyCollector public bountyCollector;

  /// @dev Position ID => Native Token Amount
  mapping(uint256 => uint256) public rewards;
  mapping(address => bool) public okRewardAssigners;

  modifier onlyWhitelistedRewardAssigners() {
    require(okRewardAssigners[msg.sender], "Vault: Reward assigner not whitelisted");
    _;
  }

  /// @dev Require that the caller must be an EOA account if not whitelisted.
  modifier onlyEOAorWhitelisted() {
    if (!config.whitelistedCallers(msg.sender)) {
      require(msg.sender == tx.origin, "Vault: Not EOA");
    }
    _;
  }

  /// @dev Get token from msg.sender
  modifier transferTokenToVault(uint256 value) {
    if (msg.value != 0) {
      require(token == config.wNativeRelayer(), "baseToken is not wNative");
      require(value == msg.value, "value != msg.value");
      IWBNB(config.nativeTokenAddr()).deposit{ value: msg.value }();
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

  function initialize(
    IVaultConfig _config,
    address _token,
    IBountyCollector _bountyCollector,
    string calldata _name,
    string calldata _symbol
  ) external initializer {
    __Ownable_init();
    __ReentrancyGuard_init();
    __ERC20_init(_name, _symbol);

    nextPositionID = 1;
    config = _config;
    token = _token;

    bountyCollector = _bountyCollector;

    // free-up execution scope
    _IN_EXEC_LOCK = _NOT_ENTERED;
    POSITION_ID = _NO_ID;
    STRATEGY = _NO_ADDRESS;
  }

  /// @dev Return Token value of the given position.
  /// @param id The position ID to query.
  function positionInfo(uint256 id) external view returns (uint256) {
    Position storage pos = positions[id];
    return (IWorker(pos.worker).tokensToReceive(id));
  }

  /// @dev Return the total token entitled to the token holders. Be careful of unaccrued interests.
  function totalToken() public view override returns (uint256) {
    return SafeToken.myBalance(token);
  }

  /// @dev Request Funds from user through Vault
  function requestFunds(address targetedToken, uint256 amount) external override inExec {
    SafeToken.safeTransferFrom(targetedToken, positions[POSITION_ID].owner, msg.sender, amount);
  }

  /// @dev Transfer to "to". Automatically unwrap if BTOKEN is WBNB
  /// @param to The address of the receiver
  /// @param amount The amount to be withdrawn
  function _safeUnwrap(address to, uint256 amount) internal {
    if (token == config.nativeTokenAddr()) {
      SafeToken.safeTransfer(token, config.wNativeRelayer(), amount);
      IWNativeRelayer(config.wNativeRelayer()).withdraw(amount);
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
  ) external payable override onlyEOAorWhitelisted transferTokenToVault(amount) nonReentrant {
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
    emit Work(id, amount);
    // Update execution scope variables
    POSITION_ID = id;
    (STRATEGY, ) = abi.decode(data, (address, bytes));
    require(config.isWorker(worker), "not a worker");

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

  function registerRewards(uint256[] calldata pids, uint256[] calldata amounts)
    external
    override
    onlyWhitelistedRewardAssigners
  {
    uint256 length = pids.length;

    require(length == amounts.length, "Vault: invalid input data");

    for (uint256 i = 0; i < length; i++) {
      rewards[pids[i]] = rewards[pids[i]].add(amounts[i]);
    }
  }

  function collectReward(uint256 pid) external override {
    Position memory position = positions[pid];

    IWorker worker = IWorker(position.worker);

    uint256 yieldFiBps = worker.treasuryFeeBps();
    uint256 clientBps = worker.getClientFee(position.client);

    // Gas savings
    uint256 baseReward = rewards[pid];

    require(
      (baseReward * 10000) / 10000 == baseReward,
      "Vault: Too little amout to collect (precision loss)"
    );

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

    addresses[0] = config.getTreasuryAddr();
    addresses[1] = positions[pid].client;

    // Transfer assets to bounty collector and register the amounts
    bountyCollector.registerBounties(addresses, fees);
    token.safeTransfer(address(bountyCollector), feeSum);

    // Finally transfer assets to the end user
    token.safeTransfer(position.owner, userReward);

    // Emit
    emit RewardCollect(msg.sender, position.owner, userReward);
  }

  /// @dev Fallback function to accept BNB.
  receive() external payable {}
}
