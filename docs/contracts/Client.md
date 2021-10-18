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



### initialize

```solidity
  function initialize(string kind, string clientName, address _protocolManager, address _feeCollector, address[] initialOperators)
```

Function to initialize new contract instance.



#### Parameters:

- `kind`: Kind of new client

- `clientName`: Name of new client

- `_protocolManager`: Address of protocol manager contract

- `_feeCollector`: Address of fee collector contract

- `initialOperators`: Initial array of operator's addresses to whitelist

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


### collectReward

```solidity
  function collectReward(uint256 pid, address recipient, address rewardTokenOrVaultAddress)
```

Collect accumulated rewards



#### Parameters:

- `pid`: Position ID

- `recipient`: Position owner

- `rewardTokenOrVaultAddress`: Information about asset in which reward will be paid out

### setWorkerFee

```solidity
  function setWorkerFee(address worker, uint256 feeBps)
```

Set client-side fee for given worker



#### Parameters:

- `worker`: target worker(pool) address

- `feeBps`: new fee denominator (0 < feeBps < 10000)

### collectFee

```solidity
  function collectFee(address _to)
```

Withdraw all collected fee


> **NOTE:** Function can be called by whitelisted operators

#### Parameters:

- `_to`: Address of fee recipient


### feeToCollect

```solidity
  function feeToCollect() external returns(uint256)
```

Returns amount of fee to collect




#### Return Values:

- `uint256`: Amount of fee to collect
### toggleWorkers

```solidity
  function toggleWorkers(address[] workers, bool isEnabled)
```

Enable or disabled given array of workers



#### Parameters:

- `workers`: array of workers' addresses to perform action on

- `isEnabled`: new worker status relative for client end users

### getName

```solidity
  function getName() external returns(string)
```

Returns client's name




#### Return Values:

- `string`: client's name
### estimateDeposit

```solidity
  function estimateDeposit(address worker, uint256 amount) public returns(uint256, uint256, uint256, uint256)
```

Function to get data about deposit



#### Parameters:

- `worker`: Address of worker (farm)

- `amount`: Amount of base token to deposit


#### Return Values:

- `uint256`: Amount of the part of the base token after split

- `uint256`: Amount of the part of the base token after split

- `uint256`: Amount of the token0 which will be received from swapped base token

- `uint256`: Amount of the token1 which will be received from swapped base token

___

## Events

### WhitelistOperators

```solidity
  event WhitelistOperators(address caller, address[] operators, bool isOk)
```
Event is emmitted when new operators are whitelisted


#### Parameters:

- `caller`: Address of msg.sender

- `operators`: Array of operators to whitelist

- `isOk`: Whether operators will be whitelisted or not

### WhitelistCallers

```solidity
  event WhitelistCallers(address caller, address[] callers, bool isOk)
```
Event is emmitted when new callers are whitelisted


#### Parameters:

- `caller`: Address of msg.sender

- `callers`: Array of callers to whitelist

- `isOk`: Whether callers will be whitelisted or not

### Deposit

```solidity
  event Deposit(address recipient, address worker, uint256 amount)
```
Event is emmitted when deposit function will be called


#### Parameters:

- `recipient`: Address for which protocol should open new position, reward will be sent there later on

- `worker`: Address of target worker

- `amount`: Amount of vault operating token (asset) user is willing to enter protocol with.

### SetWorkerFee

```solidity
  event SetWorkerFee(address caller, address worker, uint256 feeBps)
```
Event is emmited when fee for given worker(pool) will be changed


#### Parameters:

- `caller`: Address of msg.sender

- `worker`: target worker(pool) address

- `feeBps`: new fee denominator (0 < feeBps < 10000)

### ToggleWorkers

```solidity
  event ToggleWorkers(address caller, address[] workers, bool isEnabled)
```
Event is emmited when workers will be enabled or disabled


#### Parameters:

- `caller`: Address of msg.sender

- `workers`: array of workers' addresses to perform action on

- `isEnabled`: new worker status relative for client end users

