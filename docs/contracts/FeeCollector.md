# FeeCollector




___

## Functions

### setConfig

```solidity
  function setConfig(address feeToken, uint256 feeThreshold)
```

Set new configuration for the fee collector



#### Parameters:

- `feeToken`: Address of token in which fee is accumulated

- `feeThreshold`: The threshold for claiming fee

### collect

```solidity
  function collect()
```

Collect all fee for given account


> **NOTE:** Can be called only by approved clients or protocol's operators


### registerFees

```solidity
  function registerFees(address[] accounts, uint256[] amounts)
```

Register bounties (at the same time register amount for the client and for the yieldFi)
One function to wrap two calls. They should be called one by one anyway.
(If client receives fee, yieldFi does as well)


> **NOTE:** Function can be called by Vault contract

#### Parameters:

- `accounts`: Array of accounts address

- `amounts`: Array of fee amounts assign to the specific accounts


### getFeeToken

```solidity
  function getFeeToken() external returns(address)
```

Returns address of fee token




#### Return Values:

- `address`: Address of fee token
### feeToCollect

```solidity
  function feeToCollect() external returns(uint256)
```

Returns amount of fee to collect


> **NOTE:** Function can be called only by approved clients or protocol's operators


### forceCollect

```solidity
  function forceCollect(address[] clients)
```

Force collects for any given clients



#### Parameters:

- `clients`: array of addresses to perform force transfers on


___

## Events

### Collect

```solidity
  event Collect(address _from, address _to, uint256 _amount)
```
Event is emitted when fee will be collected


#### Parameters:

- `_from`: Address of account which calls collect

- `_to`: Address to withdraw collected fee

- `_amount`: Amount of withdrawn fee

### RegisterFees

```solidity
  event RegisterFees(address vault, address[] accounts, uint256[] fees)
```
Event is emitted when fees will be registered


#### Parameters:

- `vault`: Address of vault which will register new fees

- `accounts`: Address of fee recipients

- `fees`: Amounts of fee

