// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.3;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC20Upgradeable.sol";

import "./interfaces/IWorker.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IVaultConfig.sol";
import "./interfaces/IWBNB.sol";
import "./interfaces/IWNativeRelayer.sol";
import "./utils/SafeToken.sol";

contract Vault is
  IVault,
  Initializable,
  UUPSUpgradeable,
  OwnableUpgradeable,
  ERC20Upgradeable,
  ReentrancyGuardUpgradeable
{
  /// @notice Libraries
  using SafeToken for address;
  using SafeMathUpgradeable for uint256;

  /// @notice Events
  event AddDebt(uint256 indexed id, uint256 debtShare);
  event RemoveDebt(uint256 indexed id, uint256 debtShare);
  event Work(uint256 indexed id, uint256 loan);
  event Kill(
    uint256 indexed id,
    address indexed killer,
    address owner,
    uint256 posVal,
    uint256 prize
  );
  event AddCollateral(
    uint256 indexed id,
    uint256 amount,
    uint256 healthBefore,
    uint256 healthAfter
  );

  /// @dev Flags for manage execution scope
  uint256 private constant _NOT_ENTERED = 1;
  uint256 private constant _ENTERED = 2;
  uint256 private constant _NO_ID = type(uint256).max;
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
    uint256 debtShare;
  }

  IVaultConfig public config;
  mapping(uint256 => Position) public positions;
  uint256 public nextPositionID;
  uint256 public fairLaunchPoolId;

  uint256 public vaultDebtShare;
  uint256 public vaultDebtVal;
  uint256 public reservePool;

  /// @dev Require that the caller must be an EOA account if not whitelisted.
  modifier onlyEOAorWhitelisted() {
    if (!config.whitelistedCallers(msg.sender)) {
      require(msg.sender == tx.origin, "not eoa");
    }
    _;
  }

  /// @dev Require that the caller must be an EOA account if not whitelisted.
  modifier onlyWhitelistedLiqudators() {
    require(
      config.whitelistedLiquidators(msg.sender),
      "!whitelisted liquidator"
    );
    _;
  }

  /// @dev Get token from msg.sender
  modifier transferTokenToVault(uint256 value) {
    if (msg.value != 0) {
      require(
        token == config.getWrappedNativeAddr(),
        "baseToken is not wNative"
      );
      require(value == msg.value, "value != msg.value");
      IWBNB(config.getWrappedNativeAddr()).deposit{ value: msg.value }();
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
    string calldata _name,
    string calldata _symbol
  ) external initializer {
    __Ownable_init();
    __UUPSUpgradeable_init();
    __ERC20_init(_name, _symbol);

    nextPositionID = 1;
    config = _config;
    token = _token;

    // free-up execution scope
    _IN_EXEC_LOCK = _NOT_ENTERED;
    POSITION_ID = _NO_ID;
    STRATEGY = _NO_ADDRESS;
  }

  function _authorizeUpgrade(address) internal override onlyOwner {}

   /// @dev Return the Token debt value given the debt share. Be careful of unaccrued interests.
  /// @param debtShare The debt share to be converted.
  function debtShareToVal(uint256 debtShare) public view returns (uint256) {
    if (vaultDebtShare == 0) return debtShare; // When there's no share, 1 share = 1 val.
    return debtShare.mul(vaultDebtVal).div(vaultDebtShare);
  }

  /// @dev Return the debt share for the given debt value. Be careful of unaccrued interests.
  /// @param debtVal The debt value to be converted.
  function debtValToShare(uint256 debtVal) public view returns (uint256) {
    if (vaultDebtShare == 0) return debtVal; // When there's no share, 1 share = 1 val.
    return debtVal.mul(vaultDebtShare).div(vaultDebtVal);
  }

  /// @dev Return Token value and debt of the given position.
  /// @param id The position ID to query.
  function positionInfo(uint256 id) external view returns (uint256, uint256) {
    Position storage pos = positions[id];
    return (IWorker(pos.worker).health(id), debtShareToVal(pos.debtShare));
  }

  /// @dev Return the total token entitled to the token holders. Be careful of unaccrued interests.
  function totalToken() public view override returns (uint256) {
    return SafeToken.myBalance(token).add(vaultDebtVal).sub(reservePool);
  }

  /// @dev Request Funds from user through Vault
  function requestFunds(address targetedToken, uint256 amount)
    external
    override
    inExec
  {
    SafeToken.safeTransferFrom(
      targetedToken,
      positions[POSITION_ID].owner,
      msg.sender,
      amount
    );
  }

  /// @dev Transfer to "to". Automatically unwrap if BTOKEN is WBNB
  /// @param to The address of the receiver
  /// @param amount The amount to be withdrawn
  function _safeUnwrap(address to, uint256 amount) internal {
    if (token == config.getWrappedNativeAddr()) {
      SafeToken.safeTransfer(token, config.getWNativeRelayer(), amount);
      IWNativeRelayer(config.getWNativeRelayer()).withdraw(amount);
      SafeToken.safeTransferETH(to, amount);
    } else {
      SafeToken.safeTransfer(token, to, amount);
    }
  }

  /// @dev addCollateral to the given position.
  /// @param id The ID of the position to add collaterals.
  /// @param amount The amount of BTOKEN to be added to the position
  /// @param goRogue If on skip worker stability check, else only check reserve consistency.
  /// @param data The calldata to pass along to the worker for more working context.
  function addCollateral(
    uint256 id,
    uint256 amount,
    bool goRogue,
    bytes calldata data
  )
    external
    payable
    onlyEOAorWhitelisted
    transferTokenToVault(amount)
    nonReentrant
  {
    require(id != 0, "no id 0");

    // 1. Load position from state & sanity check
    Position storage pos = positions[id];
    address worker = pos.worker;
    uint256 healthBefore = IWorker(worker).health(id);
    require(id < nextPositionID, "bad position id");
    require(pos.owner == msg.sender, "!position owner");
    require(healthBefore != 0, "!active position");
    // 2. Book execution scope variables. Check if the given strategy is known add strat.
    POSITION_ID = id;
    (STRATEGY, ) = abi.decode(data, (address, bytes));
    require(config.approvedAddStrategies(STRATEGY), "!approved strat");
    // 3. If not goRouge then check worker stability, else only check reserve consistency.
    if (!goRogue) require(config.isWorkerStable(worker), "worker !stable");
    else
      require(config.isWorkerReserveConsistent(worker), "reserve !consistent");
    // 5. Perform add collateral according to the strategy.
    uint256 beforeBEP20 = SafeToken.myBalance(token).sub(amount);
    SafeToken.safeTransfer(token, worker, amount);
    IWorker(worker).work(id, data);
    uint256 healthAfter = IWorker(worker).health(id);
    uint256 back = SafeToken.myBalance(token).sub(beforeBEP20);
    // 6. Sanity check states after perform add collaterals
    // - if not goRouge then check worker stability else only check reserve consistency.
    // - back must be 0 as it is adding collateral only. No BTOKEN needed to be returned.
    // - healthAfter must more than before.
    // - debt ratio must below kill factor - 1%
    if (!goRogue) require(config.isWorkerStable(worker), "worker !stable");
    else
      require(config.isWorkerReserveConsistent(worker), "reserve !consistent");
    require(back == 0, "back !0");
    require(healthAfter > healthBefore, "health !increase");
    // uint256 killFactor = config.rawKillFactor(pos.worker, debt);
    // require(
    //   debt.mul(10000) <= healthAfter.mul(killFactor.sub(100)),
    //   "debtRatio > killFactor margin"
    // );
    // 7. Release execution scope
    POSITION_ID = _NO_ID;
    STRATEGY = _NO_ADDRESS;
    // 8. Emit event
    emit AddCollateral(id, amount, healthBefore, healthAfter);
  }

  /// @dev Create a new farming position to unlock your yield farming potential.
  /// @param id The ID of the position to unlock the earning. Use ZERO for new position.
  /// @param worker The address of the authorized worker to work for this position.
  /// @param principalAmount The anout of Token to supply by user.
  /// @param borrowAmount The amount of Token to borrow from the pool.
  /// @param data The calldata to pass along to the worker for more working context.
  function work(
    uint256 id,
    address worker,
    uint256 principalAmount,
    uint256 borrowAmount,
    bytes calldata data
  )
    external
    payable
    onlyEOAorWhitelisted
    transferTokenToVault(principalAmount)
    nonReentrant
  {
    // 1. Sanity check the input position, or add a new position of ID is 0.
    Position storage pos;
    if (id == 0) {
      id = nextPositionID++;
      pos = positions[id];
      pos.worker = worker;
      pos.owner = msg.sender;
    } else {
      pos = positions[id];
      require(id < nextPositionID, "bad position id");
      require(pos.worker == worker, "bad position worker");
      require(pos.owner == msg.sender, "not position owner");
    }
    emit Work(id, borrowAmount);
    // Update execution scope variables
    POSITION_ID = id;
    (STRATEGY, ) = abi.decode(data, (address, bytes));
    // 2. Make sure the worker can accept more debt and remove the existing debt.
    require(config.isWorker(worker), "not a worker");
    require(
      borrowAmount == 0 || config.acceptDebt(worker),
      "worker not accept more debt"
    );
    // 3. Perform the actual work, using a new scope to avoid stack-too-deep errors.
    uint256 back;
    {
      uint256 sendBEP20 = principalAmount.add(borrowAmount);
      require(
        sendBEP20 <= SafeToken.myBalance(token),
        "insufficient funds in the vault"
      );
      uint256 beforeBEP20 = SafeToken.myBalance(token).sub(sendBEP20);
      SafeToken.safeTransfer(token, worker, sendBEP20);
      IWorker(worker).work(id, data);
      back = SafeToken.myBalance(token).sub(beforeBEP20);
    }
    // 5. Release execution scope
    POSITION_ID = _NO_ID;
    STRATEGY = _NO_ADDRESS;
  }

  /// @dev Kill the given to the position. Liquidate it immediately if killFactor condition is met.
  /// @param id The position ID to be killed.
  function kill(uint256 id)
    external
    onlyWhitelistedLiqudators
    nonReentrant
  {
    Position storage pos = positions[id];
    // 3. Perform liquidation and compute the amount of token received.
    uint256 beforeToken = SafeToken.myBalance(token);
    IWorker(pos.worker).liquidate(id);
    uint256 back = SafeToken.myBalance(token).sub(beforeToken);

    uint256 liquidatorPrize = back.mul(config.getKillBps()).div(10000);
    uint256 tresauryFees = back.mul(config.getKillTreasuryBps()).div(10000);
    uint256 prize = liquidatorPrize.add(tresauryFees);
    // 4. Clear position debt and return funds to liquidator and position owner.
    if (liquidatorPrize > 0) {
      _safeUnwrap(msg.sender, liquidatorPrize);
    }

    if (tresauryFees > 0) {
      _safeUnwrap(config.getTreasuryAddr(), tresauryFees);
    }

    uint256 health = IWorker(pos.worker).health(id);

    emit Kill(id, msg.sender, pos.owner, health, prize);
  }

  /// @dev Update bank configuration to a new address. Must only be called by owner.
  /// @param _config The new configurator address.
  function updateConfig(IVaultConfig _config) external onlyOwner {
    config = _config;
  }

  /// @dev Withdraw BaseToken reserve for underwater positions to the given address.
  /// @param to The address to transfer BaseToken to.
  /// @param value The number of BaseToken tokens to withdraw. Must not exceed `reservePool`.
  function withdrawReserve(address to, uint256 value)
    external
    onlyOwner
    nonReentrant
  {
    reservePool = reservePool.sub(value);
    SafeToken.safeTransfer(token, to, value);
  }

  /// @dev Reduce BaseToken reserve, effectively giving them to the depositors.
  /// @param value The number of BaseToken reserve to reduce.
  function reduceReserve(uint256 value) external onlyOwner {
    reservePool = reservePool.sub(value);
  }

  /// @dev Fallback function to accept BNB.
  receive() external payable {}
}
