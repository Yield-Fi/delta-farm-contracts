pragma solidity 0.6.6;

import { IWorker } from "./interfaces/IWorker.sol";
import { IVault } from "./interfaces/IVault.sol";
import { IProtocolManager } from "./interfaces/IProtocolManager.sol";
import { IFeeCollector } from "./interfaces/IFeeCollector.sol";

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

  /// @dev Event is emmitted when withdraw function will be called
  /// @param recipient Address for which protocol should reduce old position, rewards are sent separatelly
  /// @param farm Address of target farm
  /// @param amount Amount of vault operating token (asset) user is willing to leave protocol with.
  event Withdraw(address indexed recipient, address indexed farm, uint256 indexed amount);

  /// @dev Event is emmitted when Claim/Harvest function will be called
  /// @param recipient Address for which protocol should reduce old position, rewards are sent separatelly
  /// @param farm Address of target farm
  /// @param amount Amount of vault operating token (asset) user is goint to harvest from protocol .
  event ClaimReward(address indexed recipient, address indexed farm, uint256 indexed amount);

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
    address[] calldata initialOperators
  ) external initializer {
    _KIND_ = kind;
    _CLIENT_NAME_ = clientName;

    protocolManager = IProtocolManager(_protocolManager);
    feeCollector = IFeeCollector(_feeCollector);

    __Ownable_init();

    _whitelistOperators(initialOperators, true);
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

    // Enter the protocol using resolved worker strategy
    /// @dev encoded: (address strategy, (address baseToken, address farmingToken, uint256 minLPAmount))
    vault.work(0, farm, amount, recipient, payload);

    // Reset approvals
    vaultToken.safeApprove(address(vault), 0);

    emit Deposit(recipient, farm, amount);
  }

  /// @dev Collect accumulated rewards
  /// @param pid Position ID
  /// @param recipient Position owner
  /// @param rewardTokenOrVaultAddress Information about asset in which reward will be paid out
  /// @notice Function can be called only by whitelisted users.
  function collectReward(
    uint256 pid,
    address recipient,
    address rewardTokenOrVaultAddress
  ) external onlyWhitelistedUsers {
    // Try to resolve Vault address based on given token address
    address vaultAddress = protocolManager.tokenToVault(rewardTokenOrVaultAddress);

    if (vaultAddress == address(0)) {
      // Vault hasn't been resolved from mapping, try direct look up

      // Did caller provide direct vault address?
      vaultAddress = rewardTokenOrVaultAddress;
    }

    require(
      vaultAddress != address(0),
      "ClientContract: Invalid rewardToken given (no operating Vaults were found)"
    );

    IVault(vaultAddress).collectReward(pid, recipient);
  }

    function withdraw(
    uint256 positionId,
    address recipient,
    address farm,
	uint256 howmuch
     ) external onlyWhitelistedUsers {
      if(howmuch==0){
      withdraw00(positionId,recipient,farm); }
      else{
      withdrawPartial(positionId,recipient,farm,howmuch);    
      } 
      
  }

  function withdraw00(
    uint256 pid,
    address recipient,
    address farm
  ) public onlyWhitelistedUsers {
    // Cast worker for further methods' usage
    IWorker _worker = IWorker(farm);

    // Cast vault for further method's usage
    IVault vault = IVault(_worker.operatingVault());

    // Enter the protocol using resolved worker strategy
    /// @dev encoded: (address strategy, (address baseToken, address token0, address token1, uint256 minLPAmount))
    /// worker.getStrategies()[2] = Liquidate
    vault.work(
      pid,
      farm,
      0,
      recipient,
      abi.encode(
        _worker.getStrategies()[2],
        abi.encode(_worker.baseToken(), _worker.token1(), _worker.token0(), 0)
      )
    );
  }

  function withdrawPartial(
    uint256 pid,
    address recipient,
    address farm,
	uint256 howmuch
  ) public onlyWhitelistedUsers {
    // Cast worker for further methods' usage
    IWorker _worker = IWorker(farm);

    // Cast vault for further method's usage
    IVault vault = IVault(_worker.operatingVault());



(,uint256 howmuch_token0, uint256 howmuch_token1, ) = estimateDeposit(farm,howmuch);
    // Enter the protocol using resolved worker strategy
    /// @dev encoded: (address strategy, (address baseToken, address token0, address token1, uint256 minLPAmount))
    /// worker.getStrategies()[3] = PartialLiquidate
    vault.work(
      pid,
      farm, // address of the worker pancake protocol in case of other protocol most liekly farm or liquid pood tangled script like worker called FARM
      0, // deposit tokens
      recipient,
      abi.encode(
        _worker.getStrategies()[3],
        abi.encode(_worker.baseToken(), _worker.token1(), _worker.token0(), howmuch, howmuch_token0, howmuch_token1)
      )
    );
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

  /// @dev Get client-side- fee for given farm
  /// @param farm Target farm address
  /// @return uint256 Fee in BPS
  function getFarmFee(address farm) external view returns (uint256) {
    return IWorker(farm).getClientFee(address(this));
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
        return enabledFarms[farm];
  }

  /// @dev Returns client's name
  /// @return string client's name
  function getName() external view returns (string memory) {
    return _CLIENT_NAME_;
  }

  /// @dev Function to get data about deposit
  /// @param worker Address of worker (farm)
  /// @param amount Amount of base token to deposit
  /// @return uint256 Amount of the part of the base token after split
  /// @return uint256 Amount of the part of the base token after split
  /// @return uint256 Amount of the token0 which will be received from swapped base token
  /// @return uint256 Amount of the token1 which will be received from swapped base token
  function estimateDeposit(address worker, uint256 amount)
    public
    view
    returns (
      uint256,
      uint256,
      uint256,
      uint256
    )
  {
    IWorker _worker = IWorker(worker);
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
