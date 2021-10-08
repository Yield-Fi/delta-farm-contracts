# SafeBEP20

Wrappers around BEP20 operations that throw on failure (when the token
contract returns false). Tokens that return no value (and instead revert or
throw on failure) are also supported, non-reverting calls are assumed to be
successful.
To use this library you can add a `using SafeBEP20 for IBEP20;` statement to your contract,
which allows you to call the safe operations as `token.safeTransfer(...)`, etc.


___

## Functions

### safeApprove



```solidity
  function safeApprove(contract IBEP20 token, address spender, uint256 value)
```

Deprecated. This function has issues similar to the ones found in
{IBEP20-approve}, and its usage is discouraged.

Whenever possible, use {safeIncreaseAllowance} and
{safeDecreaseAllowance} instead.




___

## Events

