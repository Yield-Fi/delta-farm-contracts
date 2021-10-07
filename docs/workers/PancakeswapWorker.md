# PancakeswapWorker




___

## Functions

### initialize

```solidity
  function initialize(address _operatingVault, address _baseToken, contract IPancakeMasterChef _masterChef, contract IPancakeRouterV2 _router, uint256 _pid, address[] _harvestPath, uint256 _harvestThreshold, uint256 _treasuryFeeBps, contract IProtocolManager _protocolManager)
```




### shareToBalance

```solidity
  function shareToBalance(uint256 share) public returns(uint256)
```

Return the entitied LP token balance for the given shares.



#### Parameters:

- `share`: The number of shares to be converted to LP balance.


#### Return Values:

- `uint256`: LP token balance
### balanceToShare

```solidity
  function balanceToShare(uint256 balance) public returns(uint256)
```

Return the number of shares to receive if staking the given LP tokens.



#### Parameters:

- `balance`: the number of LP tokens to be converted to shares.


#### Return Values:

- `uint256`: Number of shares
### harvestRewards

```solidity
  function harvestRewards()
```

Harvest reward tokens, swap them on base token and send to the Vault.



### work

```solidity
  function work(uint256 positionId, bytes data)
```

Work on the given position. Must be called by the operatingVault.



#### Parameters:

- `positionId`: The position ID to work on.

- `data`: The encoded data, consisting of strategy address and strategy params.

### tokensToReceive

```solidity
  function tokensToReceive(uint256 id) external returns(uint256)
```

Return the amount of BaseToken to receive if we are to liquidate the given position.



#### Parameters:

- `id`: The position ID.

### _estimateSwapOutput

```solidity
  function _estimateSwapOutput(address tokenIn, address tokenOut, uint256 amountIn, uint256 reserveInToSubtract, uint256 reserveOutToSubtract) internal returns(uint256)
```


> **NOTE:** Function to estimate swap result on pancakeswap router


### _addShare

```solidity
  function _addShare(uint256 id)
```

Internal function to stake all outstanding LP tokens to the given position ID.



### _removeShare

```solidity
  function _removeShare(uint256 id)
```

Internal function to remove shares of the ID and convert to outstanding LP tokens.



### setStrategies

```solidity
  function setStrategies(address[] supportedStrategies)
```

Set addresses of the supported strategies



#### Parameters:

- `supportedStrategies`: Array of strategies,
expect [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, Liquidate]

### getStrategies

```solidity
  function getStrategies() external returns(address[])
```

Get addresses of the supported strategies




#### Return Values:

- `Array`: of strategies: [AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, Liquidate]
### getHarvestPath

```solidity
  function getHarvestPath() public returns(address[])
```

Internal function to get harvest path. Return route through WBNB if harvestPath not set.



### setHarvestConfig

```solidity
  function setHarvestConfig(uint256 _harvestThreshold, address[] _harvestPath)
```

Set the harvest configuration.



#### Parameters:

- `_harvestThreshold`: - The threshold to update.

- `_harvestPath`: - The harvest path to update.

### setHarvestersOk

```solidity
  function setHarvestersOk(address[] harvesters, bool isOk)
```

Set the given address's to be harvestor.



#### Parameters:

- `harvesters`: - The harvest bot addresses.

- `isOk`: - Whether to approve or unapprove the given strategies.

### setTreasuryFee

```solidity
  function setTreasuryFee(uint256 _treasuryFeeBps)
```

Set treasury fee.



#### Parameters:

- `_treasuryFeeBps`: - The fee in BPS that will be charged

### getClientFee

```solidity
  function getClientFee(address clientAccount) external returns(uint256)
```

Get fee in bps for given client



#### Parameters:

- `clientAccount`: address of client account

### setClientFee

```solidity
  function setClientFee(uint256 clientFeeBps)
```

Set fee in bps for specific client



#### Parameters:

- `clientFeeBps`: The fee in BPS

### addPositionId

```solidity
  function addPositionId(uint256 positionId)
```

add new position id to the array with position ids



#### Parameters:

- `positionId`: The position ID to work on


___

## Events

### Harvest

```solidity
  event Harvest(uint256 reward, address operatingVault)
```


### AddShare

```solidity
  event AddShare(uint256 id, uint256 share)
```


### RemoveShare

```solidity
  event RemoveShare(uint256 id, uint256 share)
```


### SetHarvestConfig

```solidity
  event SetHarvestConfig(address caller, uint256 harvestThreshold, address[] harvestPath)
```


### SetHarvestersOK

```solidity
  event SetHarvestersOK(address caller, address harvestor, bool isOk)
```


### SetTreasuryFee

```solidity
  event SetTreasuryFee(address caller, uint256 feeBps)
```


### SetClientFee

```solidity
  event SetClientFee(address caller, uint256 feeBps)
```


### SetStrategies

```solidity
  event SetStrategies(address[] strategies, address caller)
```


### Work

```solidity
  event Work(address operatingVault, uint256 positionId, address strategy)
```


