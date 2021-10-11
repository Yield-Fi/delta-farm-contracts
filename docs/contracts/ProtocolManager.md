# ProtocolManager

Contains information about addresses used within the protocol, acts as semi-central protocol point


___

## Functions

### initialize

```solidity
  function initialize(address[] initialOperators)
```

initialize the owner and operators of Protocol



### ListApprovedBountyCollectors

```solidity
  function ListApprovedBountyCollectors() public returns(address[])
```

Bounty collector getter, maps to internal mapping



### checkIfApprovedBountyCollectorsIs

```solidity
  function checkIfApprovedBountyCollectorsIs(address checker) public returns(bool)
```

Bounty collector checking if addres present



### ListApprovedStrategies

```solidity
  function ListApprovedStrategies() public returns(address[])
```

Strategy getter, maps to internal mapping



### ListwhitelistOperators

```solidity
  function ListwhitelistOperators() public returns(address[])
```

whitelistOperatorsList list



### checkWhitelistOperator

```solidity
  function checkWhitelistOperator(address checker) public returns(bool)
```

whitelistOperators checking if addres present



### approvedStrategiesCheckIs

```solidity
  function approvedStrategiesCheckIs(address checker) public returns(bool)
```

approvedStrategiesCheckIs checking if addres present



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
Event is emitted when whitelisted operators will be updated


#### Parameters:

- `caller`: Address which update whitelisted operators

- `operators`: Array of operators' addresses

- `isOk`: Whether given operators are ok or not

### ApproveWorkers

```solidity
  event ApproveWorkers(address caller, address[] workers, bool isApproved)
```
Event is Emitted when approved workers will be updated


#### Parameters:

- `caller`: Address which update approved workers

- `workers`: Array of workers' addresses

- `isApproved`: Whether given workers are approved or not

### ApproveClients

```solidity
  event ApproveClients(address caller, address[] clients, bool isApproved)
```
Event is Emitted when approved client contracts will be updated


#### Parameters:

- `caller`: Address which update approved client contracts

- `clients`: Array of client contracts' addresses

- `isApproved`: Whether given clients are approved or not

### ApproveVaults

```solidity
  event ApproveVaults(address caller, address[] vaults, bool isApproved)
```
Event is Emitted when approved vaults will be updated


#### Parameters:

- `caller`: Address which update approved vaults

- `vaults`: Array of vaults' addresses

- `isApproved`: Whether given vaults are approved or not

### ApproveStrategies

```solidity
  event ApproveStrategies(address caller, address[] strategies, bool isApproved)
```
Event is Emitted when approved strategies will be updated


#### Parameters:

- `caller`: Address which update approved strategies

- `strategies`: Array of strategies' addresses

- `isApproved`: Whether given strategies are approved or not

### ApproveVaultConfigs

```solidity
  event ApproveVaultConfigs(address caller, address[] vaultConfigs, bool isApproved)
```
Event is Emitted when approved vaults' configs will be updated


#### Parameters:

- `caller`: Address which update approved vaults' configs

- `vaultConfigs`: Array of vaults' configs addresses

- `isApproved`: Whether given vaults' configs are approved or not

### ApproveBountyCollectors

```solidity
  event ApproveBountyCollectors(address caller, address[] bountyCollectors, bool isApproved)
```
Event is Emitted when approved bounty collectors will be updated


#### Parameters:

- `caller`: Address which update approved bounty collectors

- `bountyCollectors`: Array of bounty collectors' addresses

- `isApproved`: Whether given bounty collectors are approved or not

### ApproveAdminContract

```solidity
  event ApproveAdminContract(address caller, address admin)
```
Event is emitted when new admin contract will be approved


#### Parameters:

- `caller`: Address which aprrove new admin contract

- `admin`: Address of approved admin contact

### SetNativeRelayer

```solidity
  event SetNativeRelayer(address caller, address oldAddress, address newAddress)
```


