# Ownable




___

## Functions

### constructor

```solidity
  function constructor()
```

Initializes the contract setting the deployer as the initial owner.



### owner

```solidity
  function owner() public returns(address)
```

Returns the address of the current owner.



### renounceOwnership

```solidity
  function renounceOwnership()
```

Leaves the contract without owner. It will not be possible to call
`onlyOwner` functions anymore. Can only be called by the current owner.

NOTE: Renouncing ownership will leave the contract without an owner,
thereby removing any functionality that is only available to the owner.



### transferOwnership

```solidity
  function transferOwnership(address newOwner)
```

Transfers ownership of the contract to a new account (`newOwner`).
Can only be called by the current owner.



### _transferOwnership

```solidity
  function _transferOwnership(address newOwner)
```

Transfers ownership of the contract to a new account (`newOwner`).




___

## Events

### OwnershipTransferred

```solidity
  event OwnershipTransferred(address previousOwner, address newOwner)
```


