# Client




___

## Functions

### whitelistCallers



```solidity
  function whitelistCallers(address[] callers, bool isOk)
```

Whitelist methods - callers



### _whitelistOperators



```solidity
  function _whitelistOperators(address[] operators, bool isOk)
```

Whitelist methods - operators



### whitelistOperators



```solidity
  function whitelistOperators(address[] operators, bool isOk)
```

External interface for function above



### deposit



```solidity
  function deposit(address recipient, address worker, uint256 amount)
```

Vault native token in which assets should have been provided will be resolved on-the-fly using
internal ProtocolManager.

> **NOTE:** Deposit function for client's end user. a.k.a protocol entry point


#### Parameters:

- `recipient`: Address for which protocol should open new position, reward will be sent there later on

- `worker`: Address of target worker

- `amount`: Amount of vault operating token (asset) user is willing to enter protocol with.


### setWorkerFee



```solidity
  function setWorkerFee(address worker, uint256 feeBps)
```

Set client-side fee for given worker



#### Parameters:

- `worker`: target worker(pool) address

- `feeBps`: new fee denominator (0 < feeBps < 10000)

### toggleWorkers



```solidity
  function toggleWorkers(address[] workers, bool isEnabled)
```

Enable or disabled given array of workers



#### Parameters:

- `workers`: array of workers' addresses to perform action on

- `isEnabled`: new worker status relative for client end users


___

## Events

### WhitelistOperators

```solidity
  event WhitelistOperators(address caller, address[] operators, bool isOk)
```
Events


### WhitelistCallers

```solidity
  event WhitelistCallers(address caller, address[] callers, bool isOk)
```


### Deposit

```solidity
  event Deposit(address recipient, address worker, uint256 amount)
```


### SetWorkerFee

```solidity
  event SetWorkerFee(address caller, address worker, uint256 feeBps)
```


### ToggleWorkers

```solidity
  event ToggleWorkers(address caller, address[] workers, bool isEnabled)
```


