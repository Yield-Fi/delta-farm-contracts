// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";

import "./interfaces/IVaultConfig.sol";
import "./interfaces/IWorkerConfig.sol";
import "./interfaces/InterestModel.sol";

contract VaultConfig is Initializable, OwnableUpgradeSafe, IVaultConfig {
  /// @notice Events
  event SetWhitelistedCaller(address indexed caller, address indexed addr, bool ok);
  event SetParams(
    address indexed caller,
    address wrappedNative,
    address wNativeRelayer,
    address treasury
  );
  event SetWorkers(address indexed caller, address worker, address workerConfig);
  event SetMaxKillBps(address indexed caller, uint256 maxKillBps);
  event SetWhitelistedLiquidator(address indexed caller, address indexed addr, bool ok);
  event SetApprovedAddStrategy(address indexed caller, address addStrat, bool ok);

  /// Mapping for worker address to its configuration.
  mapping(address => IWorkerConfig) public workers;
  /// address for wrapped native eg WBNB, WETH
  address public override nativeTokenAddr;
  /// address for wNative Relayer
  address public override wNativeRelayer;
  /// list of whitelisted callers
  mapping(address => bool) public override whitelistedCallers;
  // address of treasury account
  address public treasury;
  // Mapping of approved add strategies
  mapping(address => bool) public override approvedAddStrategies;
  // list of whitelisted liquidators
  mapping(address => bool) public override whitelistedLiquidators;

  function initialize(
    address _getWrappedNativeAddr,
    address _getWNativeRelayer,
    address _treasury
  ) external initializer {
    __Ownable_init();

    setParams(_getWrappedNativeAddr, _getWNativeRelayer, _treasury);
  }

  /// @dev Set all the basic parameters. Must only be called by the owner.
  /// @param _treasury address of treasury account
  function setParams(
    address _nativeTokenAddr,
    address _wNativeRelayer,
    address _treasury
  ) public onlyOwner {
    nativeTokenAddr = _nativeTokenAddr;
    wNativeRelayer = _wNativeRelayer;
    treasury = _treasury;

    emit SetParams(_msgSender(), nativeTokenAddr, wNativeRelayer, treasury);
  }

  /// @dev Set the configuration for the given workers. Must only be called by the owner.
  function setWorkers(address[] calldata addrs, IWorkerConfig[] calldata configs)
    external
    onlyOwner
  {
    require(
      addrs.length == configs.length,
      "ConfigurableInterestVaultConfig::setWorkers:: bad length"
    );
    for (uint256 idx = 0; idx < addrs.length; idx++) {
      workers[addrs[idx]] = configs[idx];
      emit SetWorkers(_msgSender(), addrs[idx], address(configs[idx]));
    }
  }

  /// @dev Set whitelisted callers. Must only be called by the owner.
  function setWhitelistedCallers(address[] calldata callers, bool ok) external onlyOwner {
    for (uint256 idx = 0; idx < callers.length; idx++) {
      whitelistedCallers[callers[idx]] = ok;
      emit SetWhitelistedCaller(_msgSender(), callers[idx], ok);
    }
  }

  /// @dev Set approved add strategies. Must only be called by the owner.
  function setApprovedAddStrategy(address[] calldata addStrats, bool ok) external onlyOwner {
    for (uint256 idx = 0; idx < addStrats.length; idx++) {
      approvedAddStrategies[addStrats[idx]] = ok;
      emit SetApprovedAddStrategy(_msgSender(), addStrats[idx], ok);
    }
  }

  /// @dev Set whitelisted liquidators. Must only be called by the owner.
  function setWhitelistedLiquidators(address[] calldata callers, bool ok) external onlyOwner {
    for (uint256 idx = 0; idx < callers.length; idx++) {
      whitelistedLiquidators[callers[idx]] = ok;
      emit SetWhitelistedLiquidator(_msgSender(), callers[idx], ok);
    }
  }

  /// @dev Return whether the given address is a worker.
  function isWorker(address worker) external view override returns (bool) {
    return address(workers[worker]) != address(0);
  }

  /// @dev Return if worker is stable.
  function isWorkerStable(address worker) external view override returns (bool) {
    return workers[worker].isStable(worker);
  }

  /// @dev Return if pools is consistent
  function isWorkerReserveConsistent(address worker) external view override returns (bool) {
    return workers[worker].isReserveConsistent(worker);
  }

  /// @dev Return the treasuryAddr
  function getTreasuryAddr() external view override returns (address) {
    require(treasury != address(0), "Treasury address not set");
    return treasury;
  }
}
