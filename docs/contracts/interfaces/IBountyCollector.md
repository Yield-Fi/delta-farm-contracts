# IBountyCollector




___

## Functions

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


> **NOTE:** Whitetlist vault so it can register new bounties


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
  function registerBounties(address[] clients, uint256[] amount)
```


> **NOTE:** Register bounties



___

## Events

