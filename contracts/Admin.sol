pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";

import "./interfaces/IProtocolManager.sol";
import "./interfaces/IWorker.sol";
import "./utils/SafeToken.sol";

contract Admin is Initializable, OwnableUpgradeSafe, ReentrancyGuardUpgradeSafe {
  using SafeToken for address;

  /// @dev Event is emitted when fee for worker will be changed
  /// @param caller Address which will change fee for worker (farm)
  /// @param worker Address of given worker
  /// @param feeBps Fee in BPS (0-10000)
  event SetWorkerFee(address indexed caller, address indexed worker, uint256 feeBps);

  IProtocolManager protocolManager;

  modifier onlyOperator() {
    require(protocolManager.whitelistedOperators(msg.sender));
    _;
  }

  function initialize(address _protocolManager) external initializer {
    __Ownable_init();

    protocolManager = IProtocolManager(_protocolManager);
  }

  /// @dev Function to set fee for giver worker (farm)
  /// @param worker Address of worker (farm)
  /// @param feeBps Fee in BPS (0 < 10000)
  function setWorkerFee(address worker, uint256 feeBps) external onlyOperator {
    require(feeBps > 0 && feeBps < 5000, "Admin: incorrect feeBps value");

    IWorker(worker).setTreasuryFee(feeBps);
    emit SetWorkerFee(msg.sender, worker, feeBps);
  }

  /// @dev Function returns fee for giver worker (farm) in BPS
  /// @param worker Address of worker (farm)
  /// @return uint256 Fee in BPS (0 < 10000)
  function getWorkerFee(address worker) external view returns (uint256) {
    return IWorker(worker).treasuryFeeBps();
  }
}
