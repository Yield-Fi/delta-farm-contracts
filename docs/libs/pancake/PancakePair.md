# PancakePair




___

## Functions

### getReserves

```solidity
  function getReserves() public returns(uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)
```




### initialize

```solidity
  function initialize(address _token0, address _token1)
```




### mint

```solidity
  function mint(address to) external returns(uint256 liquidity)
```




### burn

```solidity
  function burn(address to) external returns(uint256 amount0, uint256 amount1)
```




### swap

```solidity
  function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes data)
```




### skim

```solidity
  function skim(address to)
```




### sync

```solidity
  function sync()
```





___

## Events

### Mint

```solidity
  event Mint(address sender, uint256 amount0, uint256 amount1)
```


### Burn

```solidity
  event Burn(address sender, uint256 amount0, uint256 amount1, address to)
```


### Swap

```solidity
  event Swap(address sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address to)
```


### Sync

```solidity
  event Sync(uint112 reserve0, uint112 reserve1)
```


