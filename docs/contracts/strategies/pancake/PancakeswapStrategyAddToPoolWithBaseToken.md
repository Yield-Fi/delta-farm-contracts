# PancakeswapStrategyAddToPoolWithBaseToken




___

## Functions

### initialize

```solidity
  function initialize(contract IPancakeRouterV2 _router)
```

Create a new add Token only strategy instance.



#### Parameters:

- `_router`: The PancakeSwap Router smart contract.

### execute

```solidity
  function execute(bytes data)
```

Execute worker strategy. Take BaseToken. Return LP tokens.



#### Parameters:

- `data`: Extra calldata information passed along to this strategy.

### estimateAmounts

```solidity
  function estimateAmounts(address baseToken, address token0, address token1, uint256 amount) external returns(uint256, uint256, uint256, uint256)
```

Function to estimate amounts of split and swap of the base token



#### Parameters:

- `baseToken`: Address of the base token

- `token0`: Address of the first of the token in pancake swap's pool

- `token1`: Address of the second of the token in pancake swap's pool

- `amount`: Amount of base token to deposit


#### Return Values:

- `uint256`: Amount of the part of the base token after split

- `uint256`: Amount of the part of the base token after split

- `uint256`: Amount of the token0 which will be received from swapped base token

- `uint256`: Amount of the token1 which will be received from swapped base token

___

## Events

