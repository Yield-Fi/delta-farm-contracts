# ProtocolManager

Contains information about addresses used within the protocol, acts as semi-central protocol point


___

## Functions

### initialize

```solidity
  function initialize(address[] initialOperators)
```

initialize the owner and operators of Protocol



### _whitelistOperators

```solidity
  function _whitelistOperators(address[] operators, bool isOk)
```

Enable/Disable given array of operators making them
able or unable to perform restricted set of actions


> **NOTE:** Internal ACL


#### Parameters:

- `operators`: Array of operators' public addresses to enable/disable

- `isOk`: Are operators going to be enabled or disabled?

### approveWorkers

```solidity
  function approveWorkers(address[] workers, bool isEnabled)
```

Protocol ACL



#### Parameters:

- `workers`: array of addresses

- `isEnabled`: true | false

### approveClients

```solidity
  function approveClients(address[] clients, bool isApproved)
```

Protocol ACL



#### Parameters:

- `clients`: array of addresses

- `isApproved`: true | false

### approveVaults

```solidity
  function approveVaults(address[] vaults, bool isApproved)
```

Protocol ACL



#### Parameters:

- `vaults`: array of addresses

- `isApproved`: true | false

### approveVaultConfigs

```solidity
  function approveVaultConfigs(address[] vaultConfigs, bool isApproved)
```

Protocol ACL



#### Parameters:

- `vaultConfigs`: array of addresses

- `isApproved`: true | false

### approveBountyCollectors

```solidity
  function approveBountyCollectors(address[] bountyCollectors, bool isApproved)
```

Protocol ACL



#### Parameters:

- `bountyCollectors`: array of addresses

- `isApproved`: true | false

### approveStrategies

```solidity
  function approveStrategies(address[] strategies, bool isApproved)
```

Protocol ACL



#### Parameters:

- `strategies`: array of addresses

- `isApproved`: true | false

### setNativeRelayer

```solidity
  function setNativeRelayer(address nativeRelayer)
```

Protocol Information



#### Parameters:

- `nativeRelayer`: addresses


___

## Events

### WhitelistOperators

```solidity
  event WhitelistOperators(address caller, address[] operators, bool isOk)
```
Events


### ApproveWorkers

```solidity
  event ApproveWorkers(address caller, address[] workers, bool isEnabled)
```


### ApproveClients

```solidity
  event ApproveClients(address caller, address[] entities, bool isApproved)
```


### ApproveVaults

```solidity
  event ApproveVaults(address caller, address[] entities, bool isApproved)
```


### ApproveStrategies

```solidity
  event ApproveStrategies(address caller, address[] entities, bool isApproved)
```


### ApproveVaultConfigs

```solidity
  event ApproveVaultConfigs(address caller, address[] entities, bool isApproved)
```


### ApproveBountyCollectors

```solidity
  event ApproveBountyCollectors(address caller, address[] entities, bool isApproved)
```


### SetNativeRelayer

```solidity
  event SetNativeRelayer(address caller, address oldAddress, address newAddress)
```


