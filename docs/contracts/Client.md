# Client

Smart contract for protocol's specific clients.
Contains a set of methods to interact with protocol and manage farms and users.


___

## Functions

### whitelistUsers

```solidity
  function whitelistUsers(address[] users, bool isWhitelisted)
```

Function to update registry of whitelisted users


> **NOTE:** Function can be called only by whitelisted operators

#### Parameters:

- `users`: Array of users' addresses

- `isWhitelisted`: Whether users will be whitelisted or not


### whitelistOperators

```solidity
  function whitelistOperators(address[] operators, bool isWhitelisted)
```

Update registry of whitelisted operators


> **NOTE:** Function can be called only by whitelisted operators

#### Parameters:

- `operators`: Array of operators' addresses to update

- `isWhitelisted`: Whether operators will be whitelisted or not


### isOperatorWhitelisted

```solidity
  function isOperatorWhitelisted(address account) external returns(bool)
```

Returns whether given address is whitelisted as operator



#### Parameters:

- `account`: Address of account to check


#### Return Values:

- `bool`: Whether given address is whitelisted
### isUserWhitelisted

```solidity
  function isUserWhitelisted(address account) external returns(bool)
```

Returns whether given address is whitelisted as user



#### Parameters:

- `account`: Address of account to check


#### Return Values:

- `bool`: Whether given address is whitelisted
### deposit

```solidity
  function deposit(address recipient, address farm, uint256 amount)
```

Deposit function for client's end user. a.k.a protocol entry point


> **NOTE:** Function can be called only by whitelisted users.

#### Parameters:

- `recipient`: Address for which protocol should open new position, reward will be sent there later on

- `farm`: Address of target farm

- `amount`: Amount of token (asset) user is willing to enter protocol with.


### collectReward

```solidity
  function collectReward(address farm, address recipient)
```

Collect accumulated rewards from given farm


> **NOTE:** Function can be called only by whitelisted users.

#### Parameters:

- `farm`: Address of farm from rewards will be collected

- `recipient`: Address of recipient which has been passed when the deposit was made


### collectAllRewards

```solidity
  function collectAllRewards(address recipient, address token)
```

Collect all accumulated rewards



#### Parameters:

- `recipient`: Address of recipient which has been passed when the deposit was made

- `token`: Address of token in which rewards are accumulated

### allRewardToCollect

```solidity
  function allRewardToCollect(address recipient, address token) external returns(uint256)
```

Returns amount of rewards from all farms



#### Parameters:

- `recipient`: Address of recipient which has been passed when the deposit was made

- `token`: Address of token in which rewards are accumulated

### rewardToCollect

```solidity
  function rewardToCollect(address farm, address recipient) external returns(uint256)
```

Returns amount of rewards to collect



#### Parameters:

- `farm`: Address of farm

- `recipient`: Address of recipient which has been passed when the deposit was made


#### Return Values:

- `Amount`: of rewards to collect
### setFarmsFee

```solidity
  function setFarmsFee(address[] farms, uint256 feeBps)
```

Set client-side fee for given farms


> **NOTE:** Function can be called only by whitelisted operators.

#### Parameters:

- `farms`: Array of farms' addresses

- `feeBps`: new fee denominator (0 < feeBps < 10000)


### getFarmFee

```solidity
  function getFarmFee(address farm) external returns(uint256)
```

Get client-side- fee for given farm



#### Parameters:

- `farm`: Target farm address


#### Return Values:

- `uint256`: Fee in BPS
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
### enableFarms

```solidity
  function enableFarms(address[] farms)
```

Enables given farm


> **NOTE:** Function can be called by whitelisted operators

#### Parameters:

- `farms`: Address of farm to enable


### disableFarms

```solidity
  function disableFarms(address[] farms)
```

Disables given farm


> **NOTE:** Function can be called by whitelisted operators

#### Parameters:

- `farms`: Address of farm to disable


### isFarmEnabled

```solidity
  function isFarmEnabled(address farm) external returns(bool)
```

Returns whether given farm is enabled or disabled




#### Return Values:

- `bool`: true or false
### getName

```solidity
  function getName() external returns(string)
```

Returns client's name




#### Return Values:

- `string`: client's name
### estimateDeposit

```solidity
  function estimateDeposit(address farm, uint256 amount) public returns(uint256, uint256, uint256, uint256)
```

Function to get data about deposit



#### Parameters:

- `farm`: Address of worker (farm)

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
  event WhitelistOperators(address caller, address[] operators, bool isWhitelisted)
```
Event is emmitted when new operators are whitelisted


#### Parameters:

- `caller`: Address of msg.sender

- `operators`: Array of operators to whitelist

- `isWhitelisted`: Whether operators will be whitelisted or not

### WhitelistUsers

```solidity
  event WhitelistUsers(address caller, address[] users, bool isWhitelisted)
```
Event is emmitted when new users are whitelisted


#### Parameters:

- `caller`: Address of msg.sender

- `users`: Array of Users to whitelist

- `isWhitelisted`: Whether Users will be whitelisted or not

### Deposit

```solidity
  event Deposit(address recipient, address farm, uint256 amount)
```
Event is emmitted when deposit function will be called


#### Parameters:

- `recipient`: Address for which protocol should open new position, reward will be sent there later on

- `farm`: Address of target farm

- `amount`: Amount of vault operating token (asset) user is willing to enter protocol with.

### Withdraw

```solidity
  event Withdraw(address recipient, address farm, uint256 amount)
```
Event is emmitted when withdraw function will be called


#### Parameters:

- `recipient`: Address for which protocol should reduce old position, rewards are sent separatelly

- `farm`: Address of target farm

- `amount`: Amount of vault operating token (asset) user is willing to leave protocol with.

### CollectReward

```solidity
  event CollectReward(address recipient, address farm, uint256 amount)
```
Event is emmitted when Claim/Harvest function will be called


#### Parameters:

- `recipient`: Address for which protocol should reduce old position, rewards are sent separatelly

- `farm`: Address of target farm

- `amount`: Amount of vault operating token (asset) user is goint to harvest from protocol .

### SetFarmsFee

```solidity
  event SetFarmsFee(address caller, address[] farms, uint256 feeBps)
```
Event is emmited when fee for given farms will be changed


#### Parameters:

- `caller`: Address of msg.sender

- `farms`: Array of farms' addresses

- `feeBps`: new fee denominator (0 < feeBps < 10000)

### ToggleFarms

```solidity
  event ToggleFarms(address caller, address[] farms, bool isEnabled)
```
Event is emmited when farms will be enabled or disabled


#### Parameters:

- `caller`: Address of msg.sender

- `farms`: array of farms' addresses to perform action on

- `isEnabled`: new worker status relative for client end users

### CollectFee

```solidity
  event CollectFee(address caller, address _to, uint256 amount)
```
Event is emmited when all collected fee will be withdrawn


#### Parameters:

- `caller`: Address of msg.sender

- `_to`: Address of fee recipient

- `amount`: Amount of collected fee

### CollectAllRewards

```solidity
  event CollectAllRewards(address caller, address _to, uint256 amount)
```
Event is emmited when all collected rewards will be withdrawn


#### Parameters:

- `caller`: Address of msg.sender

- `_to`: Address of rewards recipient

- `amount`: Amount of collected rewards

