# Vault




___

## Functions

### initialize

```solidity
  function initialize(contract IVaultConfig _config, address _token, contract IProtocolManager _protocolManager, contract IFeeCollector _feeCollector)
```

Function to initialize new contarct instance



#### Parameters:

- `_config`: Address of VaultConfig contract

- `_token`: Address of token which will be the base token for this vault

- `_protocolManager`: Address of protocol manager contract

- `_feeCollector`: Address of fee collector contract

### positionInfo

```solidity
  function positionInfo(uint256 id) external returns(uint256)
```

Return Token value of the given position.



#### Parameters:

- `id`: The position ID to query.

### totalToken

```solidity
  function totalToken() public returns(uint256)
```

Return the total token entitled to the token holders



### requestFunds

```solidity
  function requestFunds(address targetedToken, uint256 amount)
```

Request Funds from user through Vault


> **NOTE:** Function can be called only by strategy

#### Parameters:

- `targetedToken`: Address of requested token

- `amount`: requested amount


### work

```solidity
  function work(uint256 positionId, address worker, uint256 amount, address recipient, bytes data)
```

Create a new farming position to unlock your yield farming potential.



#### Parameters:

- `positionId`: The ID of the position to unlock the earning. Use ZERO for new position.

- `worker`: The address of the authorized worker to work for this position.

- `amount`: The anout of Token to supply by user.

- `data`: The calldata to pass along to the worker for more working context.

### updateConfig

```solidity
  function updateConfig(contract IVaultConfig _config)
```

Update bank configuration to a new address. Must only be called by owner.



#### Parameters:

- `_config`: The new configurator address.

### withdrawReserve

```solidity
  function withdrawReserve(address to, uint256 value)
```

Withdraw BaseToken reserve for underwater positions to the given address.



#### Parameters:

- `to`: The address to transfer BaseToken to.

- `value`: The number of BaseToken tokens to withdraw. Must not exceed `reservePool`.

### registerRewards

```solidity
  function registerRewards(uint256[] pids, uint256[] amounts)
```

Function to register new rewards


> **NOTE:** The order of values in the amounts array is related to the order in the pids array
Function can be called only by worker

#### Parameters:

- `pids`: Array of position ids

- `amounts`: Array of reward amounts assign to the specific positions


### collectReward

```solidity
  function collectReward(uint256 pid, address recipient)
```

Collect accumulated rewards



#### Parameters:

- `pid`: Position ID

- `recipient`: Recipient address - must match recipient address given during position opening

### collectAllRewards

```solidity
  function collectAllRewards(address owner)
```

Function to collect all rewards from each position of given owner



#### Parameters:

- `owner`: owner of positions

### rewardsToCollect

```solidity
  function rewardsToCollect(address owner) external returns(uint256)
```

Function returns amount of all rewards from owner's positions



#### Parameters:

- `owner`: Owner of positions


#### Return Values:

- `uint256`: Amount of rewards
### checkRewardsToBalanceStability

```solidity
  function checkRewardsToBalanceStability() external returns(bool)
```

Contract health component


> **NOTE:** Check if contract is able to payout all the rewards on demand



#### Return Values:

- `bool`: - true if amount of operating token is greater than or equal to total rewards value, false if not
### getAllPositions

```solidity
  function getAllPositions(uint256 fromPid) external returns(uint256[], address[], address[], address[])
```

Get all listed positions in the Vault


> **NOTE:** Return Type: [pids], [workers], [owners], [clients];
Return composition: pos<Position>{pid: pids[i], worker: workers[i] owner: owners[i], client: clients[i]}
Due to solidity flavours:
slot [0] will be occupied using zeroed values (address(0) for addresses and uint256(0) for numbers)


#### Return Values:

- `set`: of marked arrays

### getAllRewards

```solidity
  function getAllRewards(uint256 fromPid) external returns(uint256[], uint256[], uint256[])
```

Get all listed rewards in the Vault


> **NOTE:** Return Type: [pids], [rewards]
Return composition: rew<Reward>{pid: pids[i], reward: rewards[i], totalReward: totalRewards[i]}
Due to solidity flavours:
slot [0] will be occupied using zeroed values (uint256(0) for numbers)


#### Return Values:

- `set`: of marked arrays

### receive

```solidity
  function receive()
```

Fallback function to accept BNB.



### getPositionId

```solidity
  function getPositionId(address owner, address worker, address client) external returns(uint256)
```

Returns id of position



#### Parameters:

- `owner`: Position's owner

- `worker`: Position's worker (farm) address

- `client`: Position's client


#### Return Values:

- `uint256`: Id of position, returns 0 when position with given params isn't exist
### emergencyWithdraw

```solidity
  function emergencyWithdraw(address _worker)
```

Perform emergency withdrawal on given worker



#### Parameters:

- `_worker`: address of the worker to perform emergency withdraw on


___

## Events

### Work

```solidity
  event Work(uint256 id, address worker, uint256 amount, address strategy)
```
It's emitted when client contract perform deposit or withdraw action


#### Parameters:

- `id`: Index of position to perform action on

- `worker`: The address of the authorized worker to work for this position.

- `amount`: Amount of base token to supply or withdraw

- `strategy`: Address of the strategy to execute by worker

### CollectReward

```solidity
  event CollectReward(address recipient, address client, address farm, uint256 amount)
```
Event is emitted when Claim/Harvest function will be called


#### Parameters:

- `recipient`: Address for which protocol should reduce old position, rewards are sent separately

- `client`: Address of client end user comes from

- `farm`: Address of target farm

- `amount`: Amount of vault operating token (asset) user is going to harvest from protocol .

### RewardsRegister

```solidity
  event RewardsRegister(address caller, uint256[] pids, uint256[] amounts)
```
It's emitted when worker will register new harvested rewards


#### Parameters:

- `caller`: Address of worker which will register rewards

- `pids`: Array of position ids

- `amounts`: Array of reward amounts assign to the specific positions


### FeesRegister

```solidity
  event FeesRegister(address worker, uint256 yieldFiCut, uint256 clientCut, address client)
```
It's emitted when worker will register new harvested rewards


#### Parameters:

- `worker`: Address of worker which will register rewards

- `yieldFiCut`: Amount of fee yield fi has taken

- `clientCut`: Amount of fee client has taken

- `client`: client address end-user opened position from

