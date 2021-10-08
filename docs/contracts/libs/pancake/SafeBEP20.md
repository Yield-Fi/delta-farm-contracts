# SafeBEP20

Wrappers around BEP20 operations that throw on failure (when the token
contract returns false). Tokens that return no value (and instead revert or
throw on failure) are also supported, non-reverting calls are assumed to be
successful.
To use this library you can add a `using SafeBEP20 for IBEP20;` statement to your contract,
which allows you to call the safe operations as `token.safeTransfer(...)`, etc.


___

## Functions

### safeTransfer

```solidity
  function safeTransfer(contract IBEP20 token, address to, uint256 value)
```




### safeTransferFrom

```solidity
  function safeTransferFrom(contract IBEP20 token, address from, address to, uint256 value)
```




### safeApprove

```solidity
  function safeApprove(contract IBEP20 token, address spender, uint256 value)
```

Deprecated. This function has issues similar to the ones found in
{IBEP20-approve}, and its usage is discouraged.

Whenever possible, use {safeIncreaseAllowance} and
{safeDecreaseAllowance} instead.



### safeIncreaseAllowance

```solidity
  function safeIncreaseAllowance(contract IBEP20 token, address spender, uint256 value)
```




### safeDecreaseAllowance

```solidity
  function safeDecreaseAllowance(contract IBEP20 token, address spender, uint256 value)
```





___

## Events

