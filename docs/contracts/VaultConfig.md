# VaultConfig




___

## Functions

### setParams



```solidity
  function setParams(address _wrappedNativeToken, address _wrappedNativeTokenRelayer, address _treasuryAccount)
```

Set all the basic parameters. Must only be called by the owner.



#### Parameters:

- `_wrappedNativeToken`: Address of WBNB

- `_wrappedNativeTokenRelayer`: Address of WNativeRelayer contract

- `_treasuryAccount`: Address of treasury account


___

## Events

### SetParams

```solidity
  event SetParams(address caller, address wrappedNativeToken, address wrappedNativeTokenRelayer, address treasuryAccount)
```


