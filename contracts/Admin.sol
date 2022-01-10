pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "./interfaces/IProtocolManager.sol";
import "./interfaces/IWorker.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IFeeCollector.sol";
import "./utils/SafeToken.sol";

/// @dev Smart contract to interact from central admin panel
contract Admin is Initializable, OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe {
  using SafeToken for address;

  /// @dev Event is emitted when fee for farms will be changed
  /// @param caller Address which will change fee for farms
  /// @param farms Array of farms' addresses
  /// @param feeBps Fee in BPS (0-10000)
  event SetFarmsFee(address indexed caller, address[] farms, uint256 feeBps);

  /// @dev Event is emimtted when given farm will be enabled or disabled.
  /// @param caller Address which will change farm state
  /// @param farms Addresses of farm
  /// @param isEnabled New farm status
  event ToggleFarms(address indexed caller, address[] farms, bool isEnabled);

  /// @dev Event is emmited when all collected fee will be withdrawn
  /// @param caller Address of msg.sender
  /// @param _to Address of fee recipient
  /// @param amount Amount of collected fee
  event CollectFee(address indexed caller, address indexed _to, uint256 amount);

  IProtocolManager private protocolManager;
  IFeeCollector private feeCollector;

  modifier onlyOperator() {
    require(protocolManager.whitelistedOperators(msg.sender), "Admin: Only protocol operator");
    _;
  }

  function initialize(address _protocolManager, address _feeCollector) external initializer {
    __Ownable_init();

    protocolManager = IProtocolManager(_protocolManager);
    feeCollector = IFeeCollector(_feeCollector);
  }

  /// @dev Function to set fee for giver farm
  /// @param farms Array of farms' addresses
  /// @param feeBps Fee in BPS (0 < 10000)
  /// @notice Function can be called only by approved protocol's operators
  function setFarmsFee(address[] calldata farms, uint256 feeBps) external onlyOperator {
    require(feeBps >= 0 && feeBps < 5000, "Admin: incorrect feeBps value");

    for (uint256 i = 0; i < farms.length; i++) {
      IWorker(farms[i]).setTreasuryFee(feeBps);
    }
    emit SetFarmsFee(msg.sender, farms, feeBps);
  }

  /// @dev Function returns fee for giver worker (farm) in BPS
  /// @param farm Address of farm
  /// @return uint256 Fee in BPS (0 < 10000)
  function getFarmFee(address farm) external view returns (uint256) {
    return IWorker(farm).treasuryFeeBps();
  }

  /// @dev Enables given farms
  /// @param farms Addresses of farms to enable
  /// @notice Function can be called only by whitelisted protocol's operators
  function enableFarms(address[] calldata farms) external onlyOperator {
    for (uint256 i = 0; i < farms.length; i++) {
      IWorker(farms[i]).toggleWorker(true);
    }
    emit ToggleFarms(msg.sender, farms, true);
  }

  /// @dev Disables given farms
  /// @param farms Addresses of farms to disable
  /// @notice Function can be called only by whitelisted protocol's operators
  function disableFarms(address[] calldata farms) external onlyOperator {
    for (uint256 i = 0; i < farms.length; i++) {
      IWorker(farms[i]).toggleWorker(false);
    }
    emit ToggleFarms(msg.sender, farms, false);
  }

  /// @dev Returns whether given farm is enabled or disabled
  /// @return bool true or false
  function isFarmEnabled(address farm) external view returns (bool) {
    return IWorker(farm).isWorkerEnabled();
  }

  /// @dev Withdraw all collected fee
  /// @param _to Address of fee recipient
  /// @notice Function can be called only by whitelisted protocol's operators
  function collectFee(address _to) external onlyOperator {
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

  /// @dev Perform protocol emergency withdrawal
  /// @param workers array of addresses of workers to perform series of withdrawals on
  /// @param clients array of addresses of clients to force-transfer fee for
  function emergencyWithdraw(address[] calldata workers, address[] calldata clients)
    external
    onlyOperator
  {
    uint256 len = workers.length;

    for (uint256 i = 0; i < len; i++) {
      IWorker worker = IWorker(workers[i]);
      IVault vault = IVault(worker.operatingVault());

      vault.emergencyWithdraw(address(worker));
    }

    feeCollector.forceCollect(clients);
  }
}
