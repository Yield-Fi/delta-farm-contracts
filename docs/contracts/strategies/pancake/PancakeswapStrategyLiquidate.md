# PancakeswapStrategyLiquidate




___

## Functions

### initialize

```solidity
  function initialize(contract IPancakeRouterV2 _router)
```

Create a new liquidate strategy instance.



#### Parameters:

- `_router`: The PancakeSwap Router smart contract.

### execute

```solidity
  function execute(bytes data)
```

Execute worker strategy. Take LP token. Return  BaseToken.



#### Parameters:

- `data`: Encoded strategy params.

### estimateLpTokenToRemove

```solidity
  function estimateLpTokenToRemove(address baseToken, contract IPancakePair lpToken, uint256 baseTokenToGetBack) internal returns(uint256)
```

Function to estimate amount of lp token to remove from pool




___

## Events

