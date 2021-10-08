# PancakeswapWorker

Contract responsible for Pancakeswap liquidity pool handling.
Allows execute specific strategies to add, remove liquidity and harvesting rewards.


___

## Functions

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


> **NOTE:** Must be called by approved harvester bot


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

Function to get harvest path. Return route through WBNB if harvestPath not set.




#### Return Values:

- `Array`: of tokens' addresses which create harvest path
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
  function setHarvestersOk(address[] harvesters, bool isApprove)
```

Set the given address's to be harvestor.



#### Parameters:

- `harvesters`: - The harvest bot addresses.

- `isApprove`: - Whether to approve or unapprove the given harvesters.

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


___

## Events

### Harvest

```solidity
  event Harvest(uint256 reward, uint256 rewardInBaseToken, address operatingVault)
```
It's emitted when the rewards is harvesting


#### Parameters:

- `reward`: Amount of the harvested CAKE token

- `rewardInBaseToken`: Amount of the reward converted to base token

- `operatingVault`: Address of the operating vault

### AddShare

```solidity
  event AddShare(uint256 id, uint256 share)
```
It's emitted during staking LP tokens to the given position


#### Parameters:

- `id`: Position id

- `share`: Number of shares for the given position

### RemoveShare

```solidity
  event RemoveShare(uint256 id, uint256 share)
```
It's emitted during unstaking LP tokens from the given position


#### Parameters:

- `id`: Position id

- `share`: Number of removed share

### SetHarvestConfig

```solidity
  event SetHarvestConfig(address caller, uint256 harvestThreshold, address[] harvestPath)
```
It's emitted when the harvest configuration will be changed


#### Parameters:

- `caller`: Address which set the new configuration

- `harvestThreshold`: Threshold for harvesting in CAKE

- `harvestPath`: Array of token addresses as path to swap CAKE token to base token

### SetHarvesterApproval

```solidity
  event SetHarvesterApproval(address caller, address harvester, bool isApprove)
```
It's emitted when harvester approval will be changed


#### Parameters:

- `caller`: Address which change the harvester approval

- `harvester`: Address of harvester

- `isApprove`: Whether is approved or unapproved

### SetTreasuryFee

```solidity
  event SetTreasuryFee(address caller, uint256 feeBps)
```
It's emitted when treasury fee will be changed


#### Parameters:

- `caller`: Address which change the treasury fee

- `feeBps`: Fee in BPS

### SetClientFee

```solidity
  event SetClientFee(address caller, uint256 feeBps)
```
It's emitted when client fee will be changed


#### Parameters:

- `caller`: Address of client's smart contract

- `feeBps`: Fee in BPS

### SetStrategies

```solidity
  event SetStrategies(address[] strategies, address caller)
```
It's emitted when strategies' addresses will be updated


#### Parameters:

- `strategies`: Array of updated addresses

- `caller`: Address which updated strategies' addresses
[AddToPoolWithBaseToken, AddToPoolWithoutBaseToken, Liquidate]

### Work

```solidity
  event Work(address operatingVault, uint256 positionId, address strategy, bytes stratParams)
```
It's emitted when Vault will execute strategy on the worker


#### Parameters:

- `operatingVault`: Address of operating vault

- `positionId`: Id of position

- `strategy`: Address of executed strategy

- `stratParams`: Encoded params for strategy

