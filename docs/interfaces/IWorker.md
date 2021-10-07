# IWorker




___

## Functions

### work

```solidity
  function work(uint256 positionId, bytes data)
```

Work on a (potentially new) position. Optionally send token back to Vault.



### harvestRewards

```solidity
  function harvestRewards()
```

Harvest reward tokens, swap them on base token and send to the Vault.



### tokensToReceive

```solidity
  function tokensToReceive(uint256 id) external returns(uint256)
```

Return the amount of base token to get back if we are to liquidate the position.



### setStrategies

```solidity
  function setStrategies(address[] supportedStrategies)
```

Set addresses of the supported strategies



### getStrategies

```solidity
  function getStrategies() external returns(address[])
```

Get addresses of the supported strategies



### setHarvestersOk

```solidity
  function setHarvestersOk(address[] harvesters, bool isOk)
```

Set address that can be harvest



### lpToken

```solidity
  function lpToken() external returns(contract IPancakePair)
```

LP token holds by worker



### baseToken

```solidity
  function baseToken() external returns(address)
```

Token that is swapped for tokens from pool



### token0

```solidity
  function token0() external returns(address)
```

Token 0 from the pool that worker is working on



### token1

```solidity
  function token1() external returns(address)
```

Token 1 from the pool that worker is working on



### treasuryFeeBps

```solidity
  function treasuryFeeBps() external returns(uint256)
```

Treasury fee in BPS



### getClientFee

```solidity
  function getClientFee(address clientAccount) external returns(uint256)
```

Get fee in bps for given client



### setClientFee

```solidity
  function setClientFee(uint256 clientFeeBps)
```

Set fee in bps for specific client



### operatingVault

```solidity
  function operatingVault() external returns(address)
```

Get operating vault address.




___

## Events

