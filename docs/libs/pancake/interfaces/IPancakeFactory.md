# IPancakeFactory




___

## Functions

### feeTo

```solidity
  function feeTo() external returns(address)
```




### feeToSetter

```solidity
  function feeToSetter() external returns(address)
```




### getPair

```solidity
  function getPair(address tokenA, address tokenB) external returns(address pair)
```




### allPairs

```solidity
  function allPairs(uint256) external returns(address pair)
```




### allPairsLength

```solidity
  function allPairsLength() external returns(uint256)
```




### createPair

```solidity
  function createPair(address tokenA, address tokenB) external returns(address pair)
```




### setFeeTo

```solidity
  function setFeeTo(address)
```




### setFeeToSetter

```solidity
  function setFeeToSetter(address)
```





___

## Events

### PairCreated

```solidity
  event PairCreated(address token0, address token1, address pair, uint256)
```


