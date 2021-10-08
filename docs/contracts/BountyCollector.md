# BountyCollector




___

## Functions

### initialize

```solidity
  function initialize(address bountyToken, uint256 bountyThreshold)
```




### _setConfig

```solidity
  function _setConfig(address bountyToken, uint256 bountyThreshold)
```




### setConfig

```solidity
  function setConfig(address bountyToken, uint256 bountyThreshold)
```




### whitelistCollectors

```solidity
  function whitelistCollectors(address[] collectors, bool ok)
```


> **NOTE:** Whitetlist collectors so they can collect bounties


### whitelistVaults

```solidity
  function whitelistVaults(address[] vaults, bool ok)
```


> **NOTE:** Whitetlist vaults so it can register new bounties


### collect

```solidity
  function collect(address client)
```




### collectAll

```solidity
  function collectAll()
```

Be aware of gas cost!



### registerBounties

```solidity
  function registerBounties(address[] clients, uint256[] amounts)
```


> **NOTE:** Register bounties (at the same time register amount for the client and for the yieldFi)
One function to wrap two calls. They should be called one by one anyway.
(If client recevies fee, yieldFi does as well)



___

## Events

### Collect

```solidity
  event Collect(address _from, address _to, uint256 _amount)
```


