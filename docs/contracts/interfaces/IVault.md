# IVault




___

## Functions

### totalToken



```solidity
  function totalToken() external returns(uint256)
```

Return the total ERC20 entitled to the token holders. Be careful of unaccrued interests.



### requestFunds



```solidity
  function requestFunds(address targetedToken, uint256 amount)
```

Request funds from user through Vault



### work



```solidity
  function work(uint256 id, address worker, uint256 amount, address endUser, bytes data)
```

Protocol entry point




___

## Events

