# Admin




___

## Functions

### setWorkerFee

```solidity
  function setWorkerFee(address worker, uint256 feeBps)
```

Function to set fee for giver worker (farm)



#### Parameters:

- `worker`: Address of worker (farm)

- `feeBps`: Fee in BPS (0 < 10000)

### getWorkerFee

```solidity
  function getWorkerFee(address worker) external returns(uint256)
```

Function returns fee for giver worker (farm) in BPS



#### Parameters:

- `worker`: Address of worker (farm)


#### Return Values:

- `uint256`: Fee in BPS (0 < 10000)

___

## Events

### SetWorkerFee

```solidity
  event SetWorkerFee(address caller, address worker, uint256 feeBps)
```
Event is emitted when fee for worker will be changed


#### Parameters:

- `caller`: Address which will change fee for worker (farm)

- `worker`: Address of given worker

- `feeBps`: Fee in BPS (0-10000)

