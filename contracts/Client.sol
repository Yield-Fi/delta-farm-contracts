pragma solidity 0.6.6;

import { IWorker } from "./interfaces/IWorker.sol";
import { IVault } from "./interfaces/IVault.sol";
import { IProtocolManager } from "./interfaces/IProtocolManager.sol";
import { IFeeCollector } from "./interfaces/IFeeCollector.sol";
import { IERC20 } from "./libs/pancake/interfaces/IERC20.sol";

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakeFactory.sol";
import "@pancakeswap-libs/pancake-swap-core/contracts/interfaces/IPancakePair.sol";

import "./interfaces/IStrategy.sol";
import "./utils/SafeToken.sol";

/// @dev Smart contract for protocol's specific clients.
/// Contains a set of methods to interact with protocol and manage farms and users.
contract Client is Initializable, OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe {
  /// @dev Libraries
  using SafeMath for uint256;
  using SafeToken for address;

  // mapingi parametry itpo
  /*
   *  Storage
   */

  mapping(address => mapping(address => bool)) public confirmations;
  /// @dev additionalWithdrawers is additional few addresses of wallets controling this withdraw procedure.

  address[] public additionalWithdrawers;
  address[] public withdrawTargets;
  uint256 public required;

  event Execution(address indexed AddressTarget);
  event Confirmation(address indexed AddressTarget, address indexed sender);
  event ExecutionFailure(address indexed AddressTarget);

  /// @dev Event is emmitted when new operators are whitelisted
  /// @param caller Address of msg.sender
  /// @param operators Array of operators to whitelist
  /// @param isWhitelisted Whether operators will be whitelisted or not
  event WhitelistOperators(address indexed caller, address[] operators, bool indexed isWhitelisted);

  /// @dev Event is emmitted when new users are whitelisted
  /// @param caller Address of msg.sender
  /// @param users Array of Users to whitelist
  /// @param isWhitelisted Whether Users will be whitelisted or not
  event WhitelistUsers(address indexed caller, address[] users, bool indexed isWhitelisted);

  /// @dev Event is emmitted when deposit function will be called
  /// @param recipient Address for which protocol should open new position, reward will be sent there later on
  /// @param farm Address of target farm
  /// @param amount Amount of vault operating token (asset) user is willing to enter protocol with.
  event Deposit(address indexed recipient, address indexed farm, uint256 indexed amount);

  /// @dev Event is emmitted when WithDrawAll function will be called
  /// @param recipient Address for which protocol should open new position, reward will be sent there later on
  /// @param amount Amount of vault operating token (asset) user is willing to enter protocol with.
  event WithdrawAllDeposits(address indexed recipient, uint256 indexed amount);

  /// @dev Event is emmitted when withdraw function will be called
  /// @param recipient Address for which protocol should reduce old position, rewards are sent separatelly
  /// @param farm Address of target farm
  /// @param amount Amount of vault operating token (asset) user is willing to leave protocol with.
  event Withdraw(address indexed recipient, address indexed farm, uint256 indexed amount);

  /// @dev Event is emmitted when Claim/Harvest function will be called
  /// @param recipient Address for which protocol should reduce old position, rewards are sent separatelly
  /// @param farm Address of target farm
  /// @param amount Amount of vault operating token (asset) user is goint to harvest from protocol .
  event CollectReward(address indexed recipient, address indexed farm, uint256 indexed amount);

  /// @dev Event is emmited when fee for given farms will be changed
  /// @param caller Address of msg.sender
  /// @param farms Array of farms' addresses
  /// @param feeBps new fee denominator (0 < feeBps < 10000)
  event SetFarmsFee(address indexed caller, address[] farms, uint256 indexed feeBps);

  /// @dev Event is emmited when farms will be enabled or disabled
  /// @param caller Address of msg.sender
  /// @param farms array of farms' addresses to perform action on
  /// @param isEnabled new worker status relative for client end users
  event ToggleFarms(address indexed caller, address[] farms, bool indexed isEnabled);

  /// @dev Event is emmited when all collected fee will be withdrawn
  /// @param caller Address of msg.sender
  /// @param _to Address of fee recipient
  /// @param amount Amount of collected fee
  event CollectFee(address indexed caller, address indexed _to, uint256 amount);

  /// @dev Event is emmited when all collected rewards will be withdrawn
  /// @param caller Address of msg.sender
  /// @param _to Address of rewards recipient
  /// @param amount Amount of collected rewards
  event CollectAllRewards(address indexed caller, address indexed _to, uint256 amount);

  /// @dev Enabled farms
  mapping(address => bool) enabledFarms;

  /// @dev Protocol related general metadata, may be removed in further versions
  string _KIND_;
  string _CLIENT_NAME_;

  /// @dev ProtocolManager responsible for mapping token pairs to proper worker addresses
  IProtocolManager private protocolManager;

  IFeeCollector private feeCollector;

  /// @dev Whitelist mappings
  mapping(address => bool) whitelistedUsers;
  mapping(address => bool) whitelistedOperators;

  /// @dev Whitelist modifiers - Users
  modifier onlyWhitelistedUsers() {
    require(whitelistedUsers[msg.sender], "ClientContract: Caller not whitelisted.");
    _;
  }

  /// @dev Whitelist modifiers - operators
  modifier onlyWhitelistedOperators() {
    require(whitelistedOperators[msg.sender], "ClientContract: Operator not whitelisted.");
    _;
  }

  /// @dev

  /// Function to initialize new contract instance.
  /// @param kind Kind of new client
  /// @param clientName Name of new client
  /// @param _protocolManager Address of protocol manager contract
  /// @param _feeCollector Address of fee collector contract
  /// @param initialOperators Initial array of operator's addresses to whitelist
  function initialize(
    string calldata kind,
    string calldata clientName,
    address _protocolManager,
    address _feeCollector,
    address[] calldata initialOperators,
    address[] calldata additionalWithdrawRolesWallets
  ) external initializer {
    _KIND_ = kind;
    _CLIENT_NAME_ = clientName;

    protocolManager = IProtocolManager(_protocolManager);
    feeCollector = IFeeCollector(_feeCollector);

    __Ownable_init();

    _whitelistOperators(initialOperators, true);
    additionalWithdrawers = additionalWithdrawRolesWallets;

    required = 5;
  }

  /// @dev Modifier to make a function callable only when the withdraw operation is allowed.
  modifier withdrawAllowed(address recipientAddr) {
    require(allowedWithdrawTarget(recipientAddr), "nope");
    _;
  }

  modifier transactionTargetExists(address recipientAddr) {
    require(checkTransactionTargetExists(recipientAddr), "nope");
    _;
  }

  function checkTransactionTargetExists(address isTarget) private view returns (bool) {
    bool found = false;
    for (uint256 i = 0; i < withdrawTargets.length; i++) {
      if (withdrawTargets[i] == isTarget) found = true;
    }

    return found;
  }

  modifier notConfirmed(address recipientAddr, address withdrawer) {
    require(!confirmations[recipientAddr][withdrawer]);
    _;
  }

  modifier additionalWithdrawRoles(address isWithdrawer) {
    require(checkAdditionalWithdrawers(isWithdrawer));
    _;
  }

  function checkAdditionalWithdrawers(address isWithdrawer) private view returns (bool) {
    bool found = false;
    for (uint256 i = 0; i < additionalWithdrawers.length; i++) {
      if (additionalWithdrawers[i] == isWithdrawer) found = true;
    }

    return found;
  }

  function confirmWithdrawTarget(address recipientAddr)
    public
    additionalWithdrawRoles(msg.sender)
    transactionTargetExists(recipientAddr)
    notConfirmed(recipientAddr, msg.sender)
  {
    confirmations[recipientAddr][msg.sender] = true;
    emit Confirmation(recipientAddr, msg.sender);
    //  executeTransaction(transactionId);
  }

  //allowedWithdrawTarget
  /// @dev Returns the confirmation status of a transaction.
  /// @param recipientAddr is target of withdraw procedure.
  /// @return Confirmation status.
  function allowedWithdrawTarget(address recipientAddr) public view returns (bool) {
    uint256 count = 0;
    for (uint256 i = 0; i < additionalWithdrawers.length; i++) {
      if (confirmations[recipientAddr][additionalWithdrawers[i]]) count += 1;
    }
    if (count >= required) {
      return true;
    } else {
      return false;
    }
  }

  function addWithdrawTarget(address newTarget)
    public
    additionalWithdrawRoles(msg.sender)
    returns (bool)
  {
    if (!checkTransactionTargetExists(newTarget)) {
      withdrawTargets.push(newTarget);
      confirmWithdrawTarget(newTarget);
      return true;
    } else return false;
  }

  /// @dev Allows anyone to execute a confirmed transaction.
  /// @param tokenaddress if ETH ethere than 0x0, if TOKEN if token plus token addres Transaction ID.
  function executeTransaction(
    address tokenaddress,
    address payable TransactionTarget,
    uint256 tvalue
  ) public additionalWithdrawRoles(msg.sender) withdrawAllowed(TransactionTarget) {
    if (tokenaddress == address(0)) {
      //beneficiary.send(address(this).balance);

      bool sent = TransactionTarget.send(tvalue);
      if (sent) emit Execution(TransactionTarget);
      else {
        emit ExecutionFailure(TransactionTarget);
      }
    } else {
      bool tokenSendt = sendTokenAway(tokenaddress, TransactionTarget, tvalue);
      if (tokenSendt) {
        emit Execution(TransactionTarget);
      } else {
        emit ExecutionFailure(TransactionTarget);
      }
    }
  }

  function sendTokenAway(
    address StandardTokenAddress,
    address receiver,
    uint256 tokens
  ) internal returns (bool success) {
    IERC20 TokenContract = IERC20(StandardTokenAddress);
    success = TokenContract.transfer(receiver, tokens);
    return success;
  }

  /// @dev Function to update registry of whitelisted users
  /// @param users Array of users' addresses
  /// @param isWhitelisted Whether users will be whitelisted or not
  /// @notice Function can be called only by whitelisted operators
  function whitelistUsers(address[] calldata users, bool isWhitelisted)
    external
    onlyWhitelistedOperators
  {
    for (uint256 i = 0; i < users.length; i++) {
      whitelistedUsers[users[i]] = isWhitelisted;
    }

    emit WhitelistUsers(msg.sender, users, isWhitelisted);
  }

  /// Whitelist methods - operators
  function _whitelistOperators(address[] memory operators, bool isWhitelisted) internal {
    for (uint256 i = 0; i < operators.length; i++) {
      require(msg.sender != operators[i], "Client contract: Cannot modify the caller's state");

      whitelistedOperators[operators[i]] = isWhitelisted;
    }

    emit WhitelistOperators(msg.sender, operators, isWhitelisted);
  }

  /// @dev Update registry of whitelisted operators
  /// @param operators Array of operators' addresses to update
  /// @param isWhitelisted Whether operators will be whitelisted or not
  /// @notice Function can be called only by whitelisted operators
  function whitelistOperators(address[] calldata operators, bool isWhitelisted)
    external
    onlyWhitelistedOperators
  {
    _whitelistOperators(operators, isWhitelisted);
  }

  /// @dev Returns whether given address is whitelisted as operator
  /// @param account Address of account to check
  /// @return bool Whether given address is whitelisted
  function isOperatorWhitelisted(address account) external view returns (bool) {
    return whitelistedOperators[account];
  }

  /// @dev Returns whether given address is whitelisted as user
  /// @param account Address of account to check
  /// @return bool Whether given address is whitelisted
  function isUserWhitelisted(address account) external view returns (bool) {
    return whitelistedUsers[account];
  }

  /// @dev Deposit function for client's end user. a.k.a protocol entry point
  /// @param recipient Address for which protocol should open new position, reward will be sent there later on
  /// @param farm Address of target farm
  /// @param amount Amount of token (asset) user is willing to enter protocol with.
  /// @notice Function can be called only by whitelisted users.
  function deposit(
    address recipient,
    address farm,
    uint256 amount
  ) external onlyWhitelistedUsers {
    // Cast worker for further methods' usage
    IWorker _worker = IWorker(farm);

    // Check for worker outage due to client-assigned pause
    require(enabledFarms[farm], "ClientContract: Target farm hasn't been enabled by the client");

    // Cast vault for further method's usage
    IVault vault = IVault(_worker.operatingVault());

    // Get native vault token
    address vaultToken = vault.token();

    // Transfer given amount of asset from the caller (Caller must SafeApprove client contract)
    vaultToken.safeTransferFrom(msg.sender, address(this), amount);

    // Approve vault to use given assets
    vaultToken.safeApprove(address(vault), amount);

    // If worker makes usage of vault's operating token, we should covert only one asset to the second, proper one.
    /// @notice Strategy 0: Vault<BUSD> -> Worker<BUSD, USDT> (convert some portion of BUSD to USDT)
    /// @notice Strategy 1: Vault<BUSD> -> Worker<USDC, USDT> (do a split conversion)
    address workerToken0 = _worker.token0();
    address workerToken1 = _worker.token1();

    bytes memory payload = _worker.token0() == vaultToken || _worker.token1() == vaultToken
      ? abi.encode(
        _worker.getStrategies()[0],
        abi.encode(vaultToken, vaultToken == workerToken0 ? workerToken1 : workerToken0, 0)
      )
      : abi.encode(
        _worker.getStrategies()[1],
        abi.encode(vaultToken, _worker.token0(), _worker.token1(), 0)
      );

    uint256 positionId = vault.getPositionId(recipient, farm, address(this));

    // Enter the protocol using resolved worker strategy
    /// @dev encoded: (address strategy, (address baseToken, address farmingToken, uint256 minLPAmount))
    vault.work(positionId, farm, amount, recipient, payload);

    // Reset approvals
    vaultToken.safeApprove(address(vault), 0);

    emit Deposit(recipient, farm, amount);
  }

  /// @dev Collect accumulated rewards from given farm
  /// @param farm Address of farm from rewards will be collected
  /// @param recipient Address of recipient which has been passed when the deposit was made
  /// @notice Function can be called only by whitelisted users.
  function collectReward(address farm, address recipient) external onlyWhitelistedUsers {
    address vaultAddress = IWorker(farm).operatingVault();

    require(vaultAddress != address(0), "ClientContract: Invalid farm address");

    uint256 positionId = IVault(vaultAddress).getPositionId(recipient, farm, address(this));

    require(positionId != 0, "ClientContract: Position for given farm and recipient not found");

    uint256 amount = IVault(vaultAddress).rewards(positionId);
    IVault(vaultAddress).collectReward(positionId, recipient);

    emit CollectReward(recipient, farm, amount);
  }

  /// @dev Collect all accumulated rewards
  /// @param recipient Address of recipient which has been passed when the deposit was made
  /// @param token Address of token in which rewards are accumulated
  function collectAllRewards(address recipient, address token) external onlyWhitelistedUsers {
    address vaultAddress = protocolManager.tokenToVault(token);

    require(vaultAddress != address(0), "ClientContract: Invalid token address");

    uint256 amount = IVault(vaultAddress).rewardsToCollect(recipient);
    IVault(vaultAddress).collectAllRewards(recipient);

    emit CollectAllRewards(msg.sender, recipient, amount);
  }

  /// @dev Returns amount of rewards from all farms
  /// @param recipient Address of recipient which has been passed when the deposit was made
  /// @param token Address of token in which rewards are accumulated
  function allRewardToCollect(address recipient, address token) external view returns (uint256) {
    address vaultAddress = protocolManager.tokenToVault(token);

    require(vaultAddress != address(0), "ClientContract: Invalid token address");

    return IVault(vaultAddress).rewardsToCollect(recipient);
  }

  /// @dev Returns amount of rewards to collect
  /// @param farm Address of farm
  /// @param recipient Address of recipient which has been passed when the deposit was made
  /// @return Amount of rewards to collect
  function rewardToCollect(address farm, address recipient) external view returns (uint256) {
    address vaultAddress = IWorker(farm).operatingVault();

    require(vaultAddress != address(0), "ClientContract: Invalid farm address");

    uint256 positionId = IVault(vaultAddress).getPositionId(recipient, farm, address(this));

    if (positionId == 0) {
      return 0;
    }

    return IVault(vaultAddress).rewards(positionId);
  }

  function withdraw(
    address recipient,
    address farm,
    uint256 howmuch
  ) external onlyWhitelistedUsers {
    address vaultAddress = IWorker(farm).operatingVault();

    require(vaultAddress != address(0), "ClientContract: Invalid farm address");

    uint256 positionId = IVault(vaultAddress).getPositionId(recipient, farm, address(this));

    uint256 tokensToReceive = IWorker(farm).tokensToReceive(positionId);
    uint256 tokensToWithdraw;

    // If 'howmuch' is equal or greather than available tokens to withdraw, withdraw all tokens by pass 0 as argument
    if (howmuch >= tokensToReceive) {
      tokensToWithdraw = 0;
    } else {
      tokensToWithdraw = howmuch;
    }

    bytes memory strategyParams = abi.encode(
      IWorker(farm).baseToken(),
      IWorker(farm).token1(),
      IWorker(farm).token0(),
      tokensToWithdraw,
      recipient
    );

    uint256 amount_receive = IVault(vaultAddress).work(
      positionId,
      farm,
      0,
      recipient,
      abi.encode(IWorker(farm).getStrategies()[2], strategyParams)
    );

    emit Withdraw(recipient, farm, amount_receive);
  }

  /// @dev Returns estimated amount to withdraw from given farm
  /// @param farm Address of target farm
  /// @param recipient Address of recipient which has been passed when the deposit was made
  /// @return uint256 Amount to withdraw
  function amountToWithdraw(address farm, address recipient) external view returns (uint256) {
    address vaultAddress = IWorker(farm).operatingVault();

    require(vaultAddress != address(0), "ClientContract: Invalid farm address");

    uint256 positionId = IVault(vaultAddress).getPositionId(recipient, farm, address(this));

    if (positionId == 0) {
      return 0;
    }

    return IWorker(farm).tokensToReceive(positionId);
  }

  /// @dev Set client-side fee for given farms
  /// @param farms Array of farms' addresses
  /// @param feeBps new fee denominator (0 < feeBps < 10000)
  /// @notice Function can be called only by whitelisted operators.
  function setFarmsFee(address[] calldata farms, uint256 feeBps) external onlyWhitelistedOperators {
    require(0 <= feeBps && feeBps < 10000, "ClientContract: Invalid fee amount given");

    for (uint256 i = 0; i < farms.length; i++) {
      IWorker(farms[i]).setClientFee(feeBps);
    }

    emit SetFarmsFee(msg.sender, farms, feeBps);
  }

  /// @dev Get client-side fee for given farm
  /// @param farm Target farm address
  /// @return uint256 Fee in BPS
  function getFarmClientFee(address farm) external view returns (uint256) {
    IWorker worker = IWorker(farm);

    return worker.getClientFee(address(this));
  }

  /// @dev Get fee for given farm
  /// @param farm Target farm address
  /// @return uint256 Fee in BPS
  function getFarmFee(address farm) external view returns (uint256) {
    IWorker worker = IWorker(farm);

    return worker.getClientFee(address(this)).add(worker.treasuryFeeBps());
  }

  /// @dev Withdraw all collected fee
  /// @param _to Address of fee recipient
  /// @notice Function can be called by whitelisted operators
  function collectFee(address _to) external onlyWhitelistedOperators {
    feeCollector.collect();
    address feeToken = feeCollector.getFeeToken();
    uint256 feeTokenBalance = feeToken.myBalance();
    feeToken.safeTransfer(_to, feeTokenBalance);
    emit CollectFee(msg.sender, _to, feeTokenBalance);
  }

  /// @dev Returns amount of fee to collect
  /// @return uint256 Amount of fee to collect
  function feeToCollect() external view returns (uint256) {
    return feeCollector.feeToCollect();
  }

  /// @dev Enables given farm
  /// @param farms Address of farm to enable
  /// @notice Function can be called by whitelisted operators
  function enableFarms(address[] calldata farms) external onlyWhitelistedOperators {
    for (uint256 i = 0; i < farms.length; i++) {
      enabledFarms[farms[i]] = true;
    }
    emit ToggleFarms(msg.sender, farms, true);
  }

  /// @dev Disables given farm
  /// @param farms Address of farm to disable
  /// @notice Function can be called by whitelisted operators
  function disableFarms(address[] calldata farms) external onlyWhitelistedOperators {
    for (uint256 i = 0; i < farms.length; i++) {
      enabledFarms[farms[i]] = false;
    }
    emit ToggleFarms(msg.sender, farms, false);
  }

  /// @dev Returns whether given farm is enabled or disabled
  /// @return bool true or false
  function isFarmEnabled(address farm) external view returns (bool) {
    return enabledFarms[farm] && IWorker(farm).isWorkerEnabled();
  }

  /// @dev Returns client's name
  /// @return string client's name
  function getName() external view returns (string memory) {
    return _CLIENT_NAME_;
  }

  /// @dev Function to get data about deposit
  /// @param farm Address of worker (farm)
  /// @param amount Amount of base token to deposit
  /// @return uint256 Amount of the part of the base token after split
  /// @return uint256 Amount of the part of the base token after split
  /// @return uint256 Amount of the token0 which will be received from swapped base token
  /// @return uint256 Amount of the token1 which will be received from swapped base token
  function estimateDeposit(address farm, uint256 amount)
    public
    returns (
      uint256,
      uint256,
      uint256,
      uint256
    )
  {
    IWorker _worker = IWorker(farm);
    IAddStrategy strategy = IAddStrategy(chooseStrategy(_worker));
    return
      strategy.estimateAmounts(_worker.baseToken(), _worker.token0(), _worker.token1(), amount);
  }

  /// Internal function to choose appropriate strategy
  function chooseStrategy(IWorker worker) internal view returns (address) {
    // Get native vault token
    IVault vault = IVault(worker.operatingVault());
    address vaultToken = vault.token();

    return
      worker.token0() == vaultToken || worker.token1() == vaultToken
        ? worker.getStrategies()[0]
        : worker.getStrategies()[1];
  }
}
