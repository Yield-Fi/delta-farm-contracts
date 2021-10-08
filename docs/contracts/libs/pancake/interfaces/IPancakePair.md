# IPancakePair




___

## Functions

### name

```solidity
  function name() external returns(string)
```




### symbol

```solidity
  function symbol() external returns(string)
```




### decimals

```solidity
  function decimals() external returns(uint8)
```




### totalSupply

```solidity
  function totalSupply() external returns(uint256)
```




### balanceOf

```solidity
  function balanceOf(address owner) external returns(uint256)
```




### allowance

```solidity
  function allowance(address owner, address spender) external returns(uint256)
```




### approve

```solidity
  function approve(address spender, uint256 value) external returns(bool)
```




### transfer

```solidity
  function transfer(address to, uint256 value) external returns(bool)
```




### transferFrom

```solidity
  function transferFrom(address from, address to, uint256 value) external returns(bool)
```




### DOMAIN_SEPARATOR

```solidity
  function DOMAIN_SEPARATOR() external returns(bytes32)
```




### PERMIT_TYPEHASH

```solidity
  function PERMIT_TYPEHASH() external returns(bytes32)
```




### nonces

```solidity
  function nonces(address owner) external returns(uint256)
```




### permit

```solidity
  function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
```




### MINIMUM_LIQUIDITY

```solidity
  function MINIMUM_LIQUIDITY() external returns(uint256)
```




### factory

```solidity
  function factory() external returns(address)
```




### token0

```solidity
  function token0() external returns(address)
```




### token1

```solidity
  function token1() external returns(address)
```




### getReserves

```solidity
  function getReserves() external returns(uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)
```




### price0CumulativeLast

```solidity
  function price0CumulativeLast() external returns(uint256)
```




### price1CumulativeLast

```solidity
  function price1CumulativeLast() external returns(uint256)
```




### kLast

```solidity
  function kLast() external returns(uint256)
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




### initialize

```solidity
  function initialize(address, address)
```





___

## Events

### Approval

```solidity
  event Approval(address owner, address spender, uint256 value)
```


### Transfer

```solidity
  event Transfer(address from, address to, uint256 value)
```


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


