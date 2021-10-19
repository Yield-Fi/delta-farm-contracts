# Admin

Smart contract to interact from central admin panel


___

## Functions

### setFarmsFee

```solidity
  function setFarmsFee(address[] farms, uint256 feeBps)
```

Function to set fee for giver farm


> **NOTE:** Function can be called only by approved protocol's operators

#### Parameters:

- `farms`: Array of farms' addresses

- `feeBps`: Fee in BPS (0 < 10000)


### getFarmFee

```solidity
  function getFarmFee(address farm) external returns(uint256)
```

Function returns fee for giver worker (farm) in BPS



#### Parameters:

- `farm`: Address of farm


#### Return Values:

- `uint256`: Fee in BPS (0 < 10000)
### enableFarms

```solidity
  function enableFarms(address[] farms)
```

Enables given farms


> **NOTE:** Function can be called only by whitelisted protocol's operators

#### Parameters:

- `farms`: Addresses of farms to enable


### disableFarms

```solidity
  function disableFarms(address[] farms)
```

Disables given farms


> **NOTE:** Function can be called only by whitelisted protocol's operators

#### Parameters:

- `farms`: Addresses of farms to disable


### isFarmEnabled

```solidity
  function isFarmEnabled(address farm) external returns(bool)
```

Returns whether given farm is enabled or disabled




#### Return Values:

- `bool`: true or false
### collectFee

```solidity
  function collectFee(address _to)
```

Withdraw all collected fee


> **NOTE:** Function can be called only by whitelisted protocol's operators

#### Parameters:

- `_to`: Address of fee recipient


### feeToCollect

```solidity
  function feeToCollect() external returns(uint256)
```

Returns amount of fee to collect




#### Return Values:

- `uint256`: Amount of fee to collect

___

## Events

### SetFarmsFee

```solidity
  event SetFarmsFee(address caller, address[] farms, uint256 feeBps)
```
Event is emitted when fee for farms will be changed


#### Parameters:

- `caller`: Address which will change fee for farms

- `farms`: Array of farms' addresses

- `feeBps`: Fee in BPS (0-10000)

### ToggleFarms

```solidity
  event ToggleFarms(address caller, address[] farms, bool isEnabled)
```
Event is emimtted when given farm will be enabled or disabled.


#### Parameters:

- `caller`: Address which will change farm state

- `farms`: Addresses of farm

- `isEnabled`: New farm status

### CollectFee

```solidity
  event CollectFee(address caller, address _to, uint256 amount)
```
Event is emmited when all collected fee will be withdrawn


#### Parameters:

- `caller`: Address of msg.sender

- `_to`: Address of fee recipient

- `amount`: Amount of collected fee

