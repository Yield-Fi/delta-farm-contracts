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

### _addLiquidity

```solidity
  function _addLiquidity(uint256 baseTokenToSwapOnToken0, address baseToken, address token0, address token1) internal returns(uint256)
```




### _calculateAmountOfBaseTokenToSwapOnToken0

```solidity
  function _calculateAmountOfBaseTokenToSwapOnToken0(contract IPancakePair t0_t1_LP, contract IPancakePair bt_t0_LP, contract IPancakePair bt_t1_LP, address baseToken, address token0) internal returns(uint256)
```




### _calculateBaseTokenRatioToSwapOnTokens

```solidity
  function _calculateBaseTokenRatioToSwapOnTokens(contract IPancakePair t0_t1_LP, contract IPancakePair bt_t0_LP, contract IPancakePair bt_t1_LP, address baseToken, address token0) internal returns(uint256, uint256)
```




### receive

```solidity
  function receive()
```





___

## Events

