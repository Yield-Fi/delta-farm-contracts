# SimplePriceOracle




___

## Functions

### initialize

```solidity
  function initialize(address _feeder)
```




### setFeeder

```solidity
  function setFeeder(address _feeder)
```




### setPrices

```solidity
  function setPrices(address[] token0s, address[] token1s, uint256[] prices)
```

Set the prices of the token token pairs. Must be called by the feeder.



### getPrice

```solidity
  function getPrice(address token0, address token1) external returns(uint256 price, uint256 lastUpdate)
```

Return the wad price of token0/token1, multiplied by 1e18
NOTE: (if you have 1 token0 how much you can sell it for token1)




___

## Events

### PriceUpdate

```solidity
  event PriceUpdate(address token0, address token1, uint256 price)
```


