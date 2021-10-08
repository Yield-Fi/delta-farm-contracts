# VaultConfig




___

## Functions

### initialize

```solidity
  function initialize(address _wrappedNativeToken, address _wrappedNativeTokenRelayer, address _treasuryAccount)
```

Initialize new contract instance



#### Parameters:

- `_wrappedNativeToken`: Address of wrapped native token

- `_wrappedNativeTokenRelayer`: Address of WrappedNativeTokenRelayer contract

- `_treasuryAccount`: Address of treasury account

### setParams

```solidity
  function setParams(address _wrappedNativeToken, address _wrappedNativeTokenRelayer, address _treasuryAccount)
```

Set all the basic parameters. Must only be called by the owner.



#### Parameters:

- `_wrappedNativeToken`: Address of wrapped native token

- `_wrappedNativeTokenRelayer`: Address of WrappedNativeTokenRelayer contract

- `_treasuryAccount`: Address of treasury account


___

## Events

### SetParams

```solidity
  event SetParams(address caller, address wrappedNativeToken, address wrappedNativeTokenRelayer, address treasuryAccount)
```
Event is emitted when configutation parameters will be changed


#### Parameters:

- `caller`: Address which will set new parameters

- `wrappedNativeToken`: Address of wrapped native token

- `wrappedNativeTokenRelayer`: Address of WrappedNativeTokenRelayer contract

- `treasuryAccount`: Address of treasury account

