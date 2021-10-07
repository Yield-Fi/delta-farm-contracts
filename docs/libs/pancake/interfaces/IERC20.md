# IERC20




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


