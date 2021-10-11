# Vault




___

## Functions

### initialize

```solidity
  function initialize(contract IVaultConfig _config, address _token, contract IProtocolManager _protocolManager, contract IFeeCollector _feeCollector)
```

Function to initialize new contarct instance



#### Parameters:

- `_config`: Address of VaultConfig contract

- `_token`: Address of token which will be the base token for this vault

- `_protocolManager`: Address of protocol manager contract

- `_feeCollector`: Address of fee collector contract

### positionInfo

```solidity
  function positionInfo(uint256 id) external returns(uint256)
```

Return Token value of the given position.



#### Parameters:

- `id`: The position ID to query.

### totalToken

```solidity
  function totalToken() public returns(uint256)
```

Return the total token entitled to the token holders
  f



### requestFunds

```solidity
  function requestFunds(address targetedToken, uint256 amount)
```

Request Funds from user through Vault


> **NOTE:** Function can be called only by strategy
  f

#### Parameters:

- `targetedToken`: Address of requested token

- `amount`: requested amount


### work

```solidity
  function work(uint256 id, address worker, uint256 amount, address endUser, bytes data)
```

Create a new farming position to unlock your yield farming potential.



#### Parameters:

- `id`: The ID of the position to unlock the earning. Use ZERO for new position.

- `worker`: The address of the authorized worker to work for this position.

- `amount`: The anout of Token to supply by user.

- `data`: The calldata to pass along to the worker for more working context.
  f

### updateConfig

```solidity
  function updateConfig(contract IVaultConfig _config)
```

Update bank configuration to a new address. Must only be called by owner.



#### Parameters:

- `_config`: The new configurator address.
  f

### withdrawReserve

```solidity
  function withdrawReserve(address to, uint256 value)
```

Withdraw BaseToken reserve for underwater positions to the given address.



#### Parameters:

- `to`: The address to transfer BaseToken to.

- `value`: The number of BaseToken tokens to withdraw. Must not exceed `reservePool`.
  f

### registerRewards

```solidity
  function registerRewards(uint256[] pids, uint256[] amounts)
```

Function to register new rewards


> **NOTE:** The order of values in the amounts array is related to the order in the pids array
Function can be called only by worker
  f

#### Parameters:

- `pids`: Array of position ids

- `amounts`: Array of reward amounts assign to the specific positions


### collectReward

```solidity
  function collectReward(uint256 pid)
```

Collect accumulated rewards



#### Parameters:

- `pid`: Position ID
  f

### checkRewardsToBalanceStability

```solidity
  function checkRewardsToBalanceStability() external returns(bool)
```

Contract health component


> **NOTE:** Check if contract is able to payout all the rewards on demand



#### Return Values:

- `bool`: - true if amount of operating token is greater than or equal to total rewards value, false if not
  f
### receive

```solidity
  function receive()
```

Fallback function to accept BNB.
  r




___

## Events

### Work

```solidity
  event Work(uint256 id, address worker, uint256 amount, address strategy)
```
It's emitted when client contract perform deposit or withdraw action


#### Parameters:

- `id`: Index of position to perform action on

- `worker`: The address of the authorized worker to work for this position.

- `amount`: Amount of base token to supply or withdraw

- `strategy`: Address of the strategy to execute by worker

### RewardCollect

```solidity
  event RewardCollect(address caller, address rewardOwner, uint256 reward)
```
It's emitted when reward will be collected


#### Parameters:

- `caller`: Address which call collect function

- `rewardOwner`: Address of reward owner

- `reward`: Amount of collected reward

### RewardsRegister

```solidity
  event RewardsRegister(address caller, uint256[] pids, uint256[] amounts)
```
It's emitted when worker will register new harvested rewards


#### Parameters:

- `caller`: Address of worker which will register rewards

- `pids`: Array of position ids

- `amounts`: Array of reward amounts assign to the specific positions


