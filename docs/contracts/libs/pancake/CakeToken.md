# CakeToken




___

## Functions

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


