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


___

## Events

