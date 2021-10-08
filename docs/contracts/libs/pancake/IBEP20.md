# IBEP20




___

## Functions

### totalSupply

```solidity
  function totalSupply() external returns(uint256)
```

Returns the amount of tokens in existence.



### decimals

```solidity
  function decimals() external returns(uint8)
```

Returns the token decimals.



### symbol

```solidity
  function symbol() external returns(string)
```

Returns the token symbol.



### name

```solidity
  function name() external returns(string)
```

Returns the token name.



### getOwner

```solidity
  function getOwner() external returns(address)
```

Returns the bep token owner.



### balanceOf

```solidity
  function balanceOf(address account) external returns(uint256)
```

Returns the amount of tokens owned by `account`.



### transfer

```solidity
  function transfer(address recipient, uint256 amount) external returns(bool)
```

Moves `amount` tokens from the caller's account to `recipient`.

Returns a boolean value indicating whether the operation succeeded.

Emits a {Transfer} event.



### allowance

```solidity
  function allowance(address _owner, address spender) external returns(uint256)
```

Returns the remaining number of tokens that `spender` will be
allowed to spend on behalf of `owner` through {transferFrom}. This is
zero by default.

This value changes when {approve} or {transferFrom} are called.



### approve

```solidity
  function approve(address spender, uint256 amount) external returns(bool)
```

Sets `amount` as the allowance of `spender` over the caller's tokens.

Returns a boolean value indicating whether the operation succeeded.

IMPORTANT: Beware that changing an allowance with this method brings the risk
that someone may use both the old and the new allowance by unfortunate
transaction ordering. One possible solution to mitigate this race
condition is to first reduce the spender's allowance to 0 and set the
desired value afterwards:
https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729

Emits an {Approval} event.



### transferFrom

```solidity
  function transferFrom(address sender, address recipient, uint256 amount) external returns(bool)
```

Moves `amount` tokens from `sender` to `recipient` using the
allowance mechanism. `amount` is then deducted from the caller's
allowance.

Returns a boolean value indicating whether the operation succeeded.

Emits a {Transfer} event.




___

## Events

### Transfer

```solidity
  event Transfer(address from, address to, uint256 value)
```
Emitted when `value` tokens are moved from one account (`from`) to
another (`to`).

Note that `value` may be zero.


### Approval

```solidity
  event Approval(address owner, address spender, uint256 value)
```
Emitted when the allowance of a `spender` for an `owner` is set by
a call to {approve}. `value` is the new allowance.


