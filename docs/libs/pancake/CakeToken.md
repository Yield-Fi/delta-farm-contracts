# CakeToken




___

## Functions

### mint

```solidity
  function mint(address _to, uint256 _amount)
```


> **NOTE:** Creates `_amount` token to `_to`. Must only be called by the owner (MasterChef).


### delegates

```solidity
  function delegates(address delegator) external returns(address)
```


> **NOTE:** Delegate votes from `msg.sender` to `delegatee`


#### Parameters:

- `delegator`: The address to get delegatee for

### delegate

```solidity
  function delegate(address delegatee)
```


> **NOTE:** Delegate votes from `msg.sender` to `delegatee`


#### Parameters:

- `delegatee`: The address to delegate votes to

### delegateBySig

```solidity
  function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s)
```


> **NOTE:** Delegates votes from signatory to `delegatee`


#### Parameters:

- `delegatee`: The address to delegate votes to

- `nonce`: The contract state required to match the signature

- `expiry`: The time at which to expire the signature

- `v`: The recovery byte of the signature

- `r`: Half of the ECDSA signature pair

- `s`: Half of the ECDSA signature pair

### getCurrentVotes

```solidity
  function getCurrentVotes(address account) external returns(uint256)
```


> **NOTE:** Gets the current votes balance for `account`


#### Parameters:

- `account`: The address to get votes balance


#### Return Values:

- `The`: number of current votes for `account`
### getPriorVotes

```solidity
  function getPriorVotes(address account, uint256 blockNumber) external returns(uint256)
```

Block number must be a finalized block or else this function will revert to prevent misinformation.


> **NOTE:** Determine the prior number of votes for an account as of a block number


#### Parameters:

- `account`: The address of the account to check

- `blockNumber`: The block number to get the vote balance at


#### Return Values:

- `The`: number of votes the account had as of the given block
### _delegate

```solidity
  function _delegate(address delegator, address delegatee)
```




### _moveDelegates

```solidity
  function _moveDelegates(address srcRep, address dstRep, uint256 amount)
```




### _writeCheckpoint

```solidity
  function _writeCheckpoint(address delegatee, uint32 nCheckpoints, uint256 oldVotes, uint256 newVotes)
```




### safe32

```solidity
  function safe32(uint256 n, string errorMessage) internal returns(uint32)
```




### getChainId

```solidity
  function getChainId() internal returns(uint256)
```





___

## Events

### DelegateChanged

```solidity
  event DelegateChanged(address delegator, address fromDelegate, address toDelegate)
```


### DelegateVotesChanged

```solidity
  event DelegateVotesChanged(address delegate, uint256 previousBalance, uint256 newBalance)
```


