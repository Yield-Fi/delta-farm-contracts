# BEP20




___

## Functions

### constructor

```solidity
  function constructor(string name, string symbol)
```

Sets the values for {name} and {symbol}, initializes {decimals} with
a default value of 18.

To select a different value for {decimals}, use {_setupDecimals}.

All three of these values are immutable: they can only be set once during
construction.



### getOwner

```solidity
  function getOwner() external returns(address)
```

Returns the bep token owner.



### name

```solidity
  function name() public returns(string)
```

Returns the token name.



### decimals

```solidity
  function decimals() public returns(uint8)
```

Returns the token decimals.



### symbol

```solidity
  function symbol() public returns(string)
```

Returns the token symbol.



### totalSupply

```solidity
  function totalSupply() public returns(uint256)
```

See {BEP20-totalSupply}.



### balanceOf

```solidity
  function balanceOf(address account) public returns(uint256)
```

See {BEP20-balanceOf}.



### transfer

```solidity
  function transfer(address recipient, uint256 amount) public returns(bool)
```

See {BEP20-transfer}.

Requirements:

- `recipient` cannot be the zero address.
- the caller must have a balance of at least `amount`.



### allowance

```solidity
  function allowance(address owner, address spender) public returns(uint256)
```

See {BEP20-allowance}.



### approve

```solidity
  function approve(address spender, uint256 amount) public returns(bool)
```

See {BEP20-approve}.

Requirements:

- `spender` cannot be the zero address.



### transferFrom

```solidity
  function transferFrom(address sender, address recipient, uint256 amount) public returns(bool)
```

See {BEP20-transferFrom}.

Emits an {Approval} event indicating the updated allowance. This is not
required by the EIP. See the note at the beginning of {BEP20};

Requirements:
- `sender` and `recipient` cannot be the zero address.
- `sender` must have a balance of at least `amount`.
- the caller must have allowance for `sender`'s tokens of at least
`amount`.



### increaseAllowance

```solidity
  function increaseAllowance(address spender, uint256 addedValue) public returns(bool)
```

Atomically increases the allowance granted to `spender` by the caller.

This is an alternative to {approve} that can be used as a mitigation for
problems described in {BEP20-approve}.

Emits an {Approval} event indicating the updated allowance.

Requirements:

- `spender` cannot be the zero address.



### decreaseAllowance

```solidity
  function decreaseAllowance(address spender, uint256 subtractedValue) public returns(bool)
```

Atomically decreases the allowance granted to `spender` by the caller.

This is an alternative to {approve} that can be used as a mitigation for
problems described in {BEP20-approve}.

Emits an {Approval} event indicating the updated allowance.

Requirements:

- `spender` cannot be the zero address.
- `spender` must have allowance for the caller of at least
`subtractedValue`.



### mint

```solidity
  function mint(uint256 amount) public returns(bool)
```

Creates `amount` tokens and assigns them to `msg.sender`, increasing
the total supply.

Requirements

- `msg.sender` must be the token owner



### _transfer

```solidity
  function _transfer(address sender, address recipient, uint256 amount)
```

Moves tokens `amount` from `sender` to `recipient`.

This is internal function is equivalent to {transfer}, and can be used to
e.g. implement automatic token fees, slashing mechanisms, etc.

Emits a {Transfer} event.

Requirements:

- `sender` cannot be the zero address.
- `recipient` cannot be the zero address.
- `sender` must have a balance of at least `amount`.



### _mint

```solidity
  function _mint(address account, uint256 amount)
```

Creates `amount` tokens and assigns them to `account`, increasing
the total supply.

Emits a {Transfer} event with `from` set to the zero address.

Requirements

- `to` cannot be the zero address.



### _burn

```solidity
  function _burn(address account, uint256 amount)
```

Destroys `amount` tokens from `account`, reducing the
total supply.

Emits a {Transfer} event with `to` set to the zero address.

Requirements

- `account` cannot be the zero address.
- `account` must have at least `amount` tokens.



### _approve

```solidity
  function _approve(address owner, address spender, uint256 amount)
```

Sets `amount` as the allowance of `spender` over the `owner`s tokens.

This is internal function is equivalent to `approve`, and can be used to
e.g. set automatic allowances for certain subsystems, etc.

Emits an {Approval} event.

Requirements:

- `owner` cannot be the zero address.
- `spender` cannot be the zero address.



### _burnFrom

```solidity
  function _burnFrom(address account, uint256 amount)
```

Destroys `amount` tokens from `account`.`amount` is then deducted
from the caller's allowance.

See {_burn} and {_approve}.




___

## Events

