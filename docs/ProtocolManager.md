# ProtocolManager




___

## Functions

### initialize

```solidity
  function initialize()
```




### approveClientContract

```solidity
  function approveClientContract(address clientContract, bool isApproved)
```

Set new client contact as approved



#### Parameters:

- `clientContract`: New client contact's address

- `isApproved`: Client contract approval - true or false
  f

### whitelistOperators

```solidity
  function whitelistOperators(address[] operators, bool isOk)
```

Enable/Disable given array of operators making them
able or unable to perform restricted set of actions


> **NOTE:** ACL


#### Parameters:

- `operators`: Array of operators' public addresses to enable/disable

- `isOk`: Are operators going to be enabled or disabled?
  f

### toggleWorkers

```solidity
  function toggleWorkers(address[] workers, bool isEnabled)
```

Toggle workers within protocol registerer



#### Parameters:

- `workers`: addresses of target workers

- `isEnabled`: new workers' state
  f


___

## Events

### WhitelistOperators

```solidity
  event WhitelistOperators(address caller, address[] operators, bool isOk)
```


### ToggleWorkers

```solidity
  event ToggleWorkers(address caller, address[] workers, bool isEnabled)
```


### ApproveClientContract

```solidity
  event ApproveClientContract(address caller, address client, bool isApproved)
```


