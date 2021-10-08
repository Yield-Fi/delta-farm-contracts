# PancakeswapStrategyAddToPoolWithoutBaseToken




___

## Functions

### initialize



```solidity
  function initialize(contract IPancakeRouterV2 _router)
```

Create a new add to pool without base token strategy instance.



#### Parameters:

- `_router`: The PancakeSwap Router smart contract.

### execute



```solidity
  function execute(bytes data)
```

Execute worker strategy. Take BaseToken. Return LP tokens.



#### Parameters:

- `data`: Extra calldata information passed along to this strategy.


___

## Events

