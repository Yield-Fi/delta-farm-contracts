# PancakeMasterChef




___

## Functions

### constructor

```solidity
  function constructor(contract CakeToken _cake, contract SyrupBar _syrup, address _devaddr, uint256 _cakePerBlock, uint256 _startBlock)
```




### updateMultiplier

```solidity
  function updateMultiplier(uint256 multiplierNumber)
```




### poolLength

```solidity
  function poolLength() external returns(uint256)
```




### add

```solidity
  function add(uint256 _allocPoint, contract IBEP20 _lpToken, bool _withUpdate)
```




### set

```solidity
  function set(uint256 _pid, uint256 _allocPoint, bool _withUpdate)
```




### updateStakingPool

```solidity
  function updateStakingPool()
```




### setMigrator

```solidity
  function setMigrator(contract IMigratorChef _migrator)
```




### migrate

```solidity
  function migrate(uint256 _pid)
```




### getMultiplier

```solidity
  function getMultiplier(uint256 _from, uint256 _to) public returns(uint256)
```




### pendingCake

```solidity
  function pendingCake(uint256 _pid, address _user) external returns(uint256)
```




### massUpdatePools

```solidity
  function massUpdatePools()
```




### updatePool

```solidity
  function updatePool(uint256 _pid)
```




### deposit

```solidity
  function deposit(uint256 _pid, uint256 _amount)
```




### withdraw

```solidity
  function withdraw(uint256 _pid, uint256 _amount)
```




### enterStaking

```solidity
  function enterStaking(uint256 _amount)
```




### leaveStaking

```solidity
  function leaveStaking(uint256 _amount)
```




### emergencyWithdraw

```solidity
  function emergencyWithdraw(uint256 _pid)
```




### safeCakeTransfer

```solidity
  function safeCakeTransfer(address _to, uint256 _amount)
```




### dev

```solidity
  function dev(address _devaddr)
```





___

## Events

### Deposit

```solidity
  event Deposit(address user, uint256 pid, uint256 amount)
```


### Withdraw

```solidity
  event Withdraw(address user, uint256 pid, uint256 amount)
```


### EmergencyWithdraw

```solidity
  event EmergencyWithdraw(address user, uint256 pid, uint256 amount)
```


