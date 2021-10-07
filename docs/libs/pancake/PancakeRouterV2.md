# PancakeRouterV2




___

## Functions

### constructor

```solidity
  function constructor(address _factory, address _WETH)
```




### receive

```solidity
  function receive()
```




### _addLiquidity

```solidity
  function _addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin) internal returns(uint256 amountA, uint256 amountB)
```




### addLiquidity

```solidity
  function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns(uint256 amountA, uint256 amountB, uint256 liquidity)
```




### addLiquidityETH

```solidity
  function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external returns(uint256 amountToken, uint256 amountETH, uint256 liquidity)
```




### removeLiquidity

```solidity
  function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) public returns(uint256 amountA, uint256 amountB)
```




### removeLiquidityETH

```solidity
  function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) public returns(uint256 amountToken, uint256 amountETH)
```




### removeLiquidityWithPermit

```solidity
  function removeLiquidityWithPermit(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) external returns(uint256 amountA, uint256 amountB)
```




### removeLiquidityETHWithPermit

```solidity
  function removeLiquidityETHWithPermit(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) external returns(uint256 amountToken, uint256 amountETH)
```




### removeLiquidityETHSupportingFeeOnTransferTokens

```solidity
  function removeLiquidityETHSupportingFeeOnTransferTokens(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) public returns(uint256 amountETH)
```




### removeLiquidityETHWithPermitSupportingFeeOnTransferTokens

```solidity
  function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) external returns(uint256 amountETH)
```




### _swap

```solidity
  function _swap(uint256[] amounts, address[] path, address _to)
```




### swapExactTokensForTokens

```solidity
  function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns(uint256[] amounts)
```




### swapTokensForExactTokens

```solidity
  function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] path, address to, uint256 deadline) external returns(uint256[] amounts)
```




### swapExactETHForTokens

```solidity
  function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns(uint256[] amounts)
```




### swapTokensForExactETH

```solidity
  function swapTokensForExactETH(uint256 amountOut, uint256 amountInMax, address[] path, address to, uint256 deadline) external returns(uint256[] amounts)
```




### swapExactTokensForETH

```solidity
  function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns(uint256[] amounts)
```




### swapETHForExactTokens

```solidity
  function swapETHForExactTokens(uint256 amountOut, address[] path, address to, uint256 deadline) external returns(uint256[] amounts)
```




### _swapSupportingFeeOnTransferTokens

```solidity
  function _swapSupportingFeeOnTransferTokens(address[] path, address _to)
```




### swapExactTokensForTokensSupportingFeeOnTransferTokens

```solidity
  function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)
```




### swapExactETHForTokensSupportingFeeOnTransferTokens

```solidity
  function swapExactETHForTokensSupportingFeeOnTransferTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)
```




### swapExactTokensForETHSupportingFeeOnTransferTokens

```solidity
  function swapExactTokensForETHSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline)
```




### quote

```solidity
  function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public returns(uint256 amountB)
```




### getAmountOut

```solidity
  function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public returns(uint256 amountOut)
```




### getAmountIn

```solidity
  function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) public returns(uint256 amountIn)
```




### getAmountsOut

```solidity
  function getAmountsOut(uint256 amountIn, address[] path) public returns(uint256[] amounts)
```




### getAmountsIn

```solidity
  function getAmountsIn(uint256 amountOut, address[] path) public returns(uint256[] amounts)
```





___

## Events

