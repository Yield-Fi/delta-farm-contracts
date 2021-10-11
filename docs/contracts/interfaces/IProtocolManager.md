# IProtocolManager




___

## Functions

### approvedWorkers

```solidity
  function approvedWorkers(address worker) external returns(bool)
```

Worker getter, maps to internal mapping



### approvedVaults

```solidity
  function approvedVaults(address vault) external returns(bool)
```

Vault getter, maps to internal mapping



### tokenToVault

```solidity
  function tokenToVault(address token) external returns(address)
```

Token to vault mapping



### approvedVaultConfigs

```solidity
  function approvedVaultConfigs(address vaultConfig) external returns(bool)
```

Vault config getter, maps to internal mapping



### checkIfApprovedBountyCollectors

```solidity
  function checkIfApprovedBountyCollectors(address bountyCollector) external returns(bool)
```

Bounty collector getter, maps to internal mapping



### approvedStrategiesCheck

```solidity
  function approvedStrategiesCheck(address strategy) external returns(bool)
```

Strategy getter, maps to internal mapping



### approvedNativeRelayer

```solidity
  function approvedNativeRelayer() external returns(address)
```

Native relayer getter, maps to internal contract mapping



### approvedClients

```solidity
  function approvedClients(address client) external returns(bool)
```

Client getter, maps to internal mapping



### approveWorkers

```solidity
  function approveWorkers(address[] workers, bool isApproved)
```

Protocol ACL



### approveClients

```solidity
  function approveClients(address[] clients, bool isApproved)
```

Protocol ACL



### approveVaults

```solidity
  function approveVaults(address[] vaults, bool isApproved)
```

Protocol ACL



### approveVaultConfigs

```solidity
  function approveVaultConfigs(address[] vaultConfigs, bool isApproved)
```

Protocol ACL



### approveBountyCollectors

```solidity
  function approveBountyCollectors(address[] bountyCollectors, bool isApproved)
```

Protocol ACL



### approveStrategies

```solidity
  function approveStrategies(address[] strategies, bool isEnabled)
```

Protocol ACL



### setNativeRelayer

```solidity
  function setNativeRelayer(address nativeRelayer)
```

Protocol Info




___

## Events

