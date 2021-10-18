pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "./interfaces/IProtocolManager.sol";
import "./interfaces/IWorker.sol";
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

  IProtocolManager protocolManager;

  modifier onlyOperator() {
    require(protocolManager.whitelistedOperators(msg.sender));
    _;
  }

  function initialize(address _protocolManager) external initializer {
    __Ownable_init();

    protocolManager = IProtocolManager(_protocolManager);
  }

  /// @dev Function to set fee for giver farm
  /// @param farms Array of farms' addresses
  /// @param feeBps Fee in BPS (0 < 10000)
  /// @notice Function can be called only by approved protocol's operators
  function setFarmsFee(address[] calldata farms, uint256 feeBps) external onlyOperator {
    require(feeBps > 0 && feeBps < 5000, "Admin: incorrect feeBps value");

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
}
