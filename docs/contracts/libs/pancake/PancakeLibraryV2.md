# PancakeLibraryV2




___

## Functions

### sortTokens

```solidity
  function sortTokens(address tokenA, address tokenB) internal returns(address token0, address token1)
```




### pairFor

```solidity
  function pairFor(address factory, address tokenA, address tokenB) internal returns(address pair)
```




### getReserves

```solidity
  function getReserves(address factory, address tokenA, address tokenB) internal returns(uint256 reserveA, uint256 reserveB)
```




### quote

```solidity
  function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) internal returns(uint256 amountB)
```




### getAmountOut

```solidity
  function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal returns(uint256 amountOut)
```




### getAmountIn

```solidity
  function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) internal returns(uint256 amountIn)
```




### getAmountsOut

```solidity
  function getAmountsOut(address factory, uint256 amountIn, address[] path) internal returns(uint256[] amounts)
```




### getAmountsIn

```solidity
  function getAmountsIn(address factory, uint256 amountOut, address[] path) internal returns(uint256[] amounts)
```





___

## Events

