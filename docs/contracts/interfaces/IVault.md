# IVault




___

## Functions

### approvedRewardAssigners

```solidity
  function approvedRewardAssigners(address assigner) external returns(bool)
```

(Mapping) Rewards ACL - function-to-mapping

> **NOTE:** Functions' declarations for mappings and properties



### token

```solidity
  function token() external returns(address)
```

(Property) Get vault's base token



### rewards

```solidity
  function rewards(uint256 pid) external returns(uint256)
```

(Mapping) Position ID => Native Token Amount



### totalToken

```solidity
  function totalToken() external returns(uint256)
```

Return the total ERC20 entitled to the token holders. Be careful of unaccrued interests.

> **NOTE:** True functions



### requestFunds

```solidity
  function requestFunds(address targetedToken, uint256 amount)
```

Request funds from user through Vault



### work

```solidity
  function work(uint256 id, address worker, uint256 amount, address recipient, bytes data)
```

Protocol entry point



### getAllPositions

```solidity
  function getAllPositions(uint256 fromPid) external returns(uint256[], address[], address[], address[])
```

Data gathering



### getAllRewards

```solidity
  function getAllRewards(uint256 fromPid) external returns(uint256[], uint256[], uint256[])
```

Data gathering




___

## Events

