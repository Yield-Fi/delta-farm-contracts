# MockWBNB




___

## Functions

### receive

```solidity
  function receive()
```




### deposit

```solidity
  function deposit()
```




### withdraw

```solidity
  function withdraw(uint256 wad)
```




### mint

```solidity
  function mint(address guy, uint256 wad)
```




### totalSupply

```solidity
  function totalSupply() public returns(uint256)
```




### approve

```solidity
  function approve(address guy, uint256 wad) public returns(bool)
```




### transfer

```solidity
  function transfer(address dst, uint256 wad) public returns(bool)
```




### transferFrom

```solidity
  function transferFrom(address src, address dst, uint256 wad) public returns(bool)
```





___

## Events

### Approval

```solidity
  event Approval(address src, address guy, uint256 wad)
```


### Transfer

```solidity
  event Transfer(address src, address dst, uint256 wad)
```


### Deposit

```solidity
  event Deposit(address dst, uint256 wad)
```


### Withdrawal

```solidity
  event Withdrawal(address src, uint256 wad)
```


