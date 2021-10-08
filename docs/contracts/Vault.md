# Vault




___

## Functions

### initialize

```solidity
  function initialize(contract IVaultConfig _config, address _token, contract IProtocolManager _protocolManager, contract IBountyCollector _bountyCollector)
```




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

Return the total token entitled to the token holders. Be careful of unaccrued interests.
  f



### requestFunds

```solidity
  function requestFunds(address targetedToken, uint256 amount)
```

Request Funds from user through Vault
  f



### _safeUnwrap

```solidity
  function _safeUnwrap(address to, uint256 amount)
```

Transfer to "to". Automatically unwrap if BTOKEN is WBNB



#### Parameters:

- `to`: The address of the receiver

- `amount`: The amount to be withdrawn
  f

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
  event Work(uint256 id, uint256 loan)
```


### RewardCollect

```solidity
  event RewardCollect(address caller, address rewardOwner, uint256 reward)
```


### RewardsRegister

```solidity
  event RewardsRegister(address caller, uint256[] pids, uint256[] amounts)
```


