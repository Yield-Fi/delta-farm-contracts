# SafeMath

Wrappers over Solidity's arithmetic operations with added overflow
checks.

Arithmetic operations in Solidity wrap on overflow. This can easily result
in bugs, because programmers usually assume that an overflow raises an
error, which is the standard behavior in high level programming languages.
`SafeMath` restores this intuition by reverting the transaction when an
operation overflows.

Using this library instead of the unchecked operations eliminates an entire
class of bugs, so it's recommended to use it always.


___

## Functions

### add

```solidity
  function add(uint256 a, uint256 b) internal returns(uint256)
```

Returns the addition of two unsigned integers, reverting on
overflow.

Counterpart to Solidity's `+` operator.

Requirements:

- Addition cannot overflow.



### sub

```solidity
  function sub(uint256 a, uint256 b) internal returns(uint256)
```

Returns the subtraction of two unsigned integers, reverting on
overflow (when the result is negative).

Counterpart to Solidity's `-` operator.

Requirements:

- Subtraction cannot overflow.



### sub

```solidity
  function sub(uint256 a, uint256 b, string errorMessage) internal returns(uint256)
```

Returns the subtraction of two unsigned integers, reverting with custom message on
overflow (when the result is negative).

Counterpart to Solidity's `-` operator.

Requirements:

- Subtraction cannot overflow.



### mul

```solidity
  function mul(uint256 a, uint256 b) internal returns(uint256)
```

Returns the multiplication of two unsigned integers, reverting on
overflow.

Counterpart to Solidity's `*` operator.

Requirements:

- Multiplication cannot overflow.



### div

```solidity
  function div(uint256 a, uint256 b) internal returns(uint256)
```

Returns the integer division of two unsigned integers. Reverts on
division by zero. The result is rounded towards zero.

Counterpart to Solidity's `/` operator. Note: this function uses a
`revert` opcode (which leaves remaining gas untouched) while Solidity
uses an invalid opcode to revert (consuming all remaining gas).

Requirements:

- The divisor cannot be zero.



### div

```solidity
  function div(uint256 a, uint256 b, string errorMessage) internal returns(uint256)
```

Returns the integer division of two unsigned integers. Reverts with custom message on
division by zero. The result is rounded towards zero.

Counterpart to Solidity's `/` operator. Note: this function uses a
`revert` opcode (which leaves remaining gas untouched) while Solidity
uses an invalid opcode to revert (consuming all remaining gas).

Requirements:

- The divisor cannot be zero.



### mod

```solidity
  function mod(uint256 a, uint256 b) internal returns(uint256)
```

Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
Reverts when dividing by zero.

Counterpart to Solidity's `%` operator. This function uses a `revert`
opcode (which leaves remaining gas untouched) while Solidity uses an
invalid opcode to revert (consuming all remaining gas).

Requirements:

- The divisor cannot be zero.



### mod

```solidity
  function mod(uint256 a, uint256 b, string errorMessage) internal returns(uint256)
```

Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
Reverts with custom message when dividing by zero.

Counterpart to Solidity's `%` operator. This function uses a `revert`
opcode (which leaves remaining gas untouched) while Solidity uses an
invalid opcode to revert (consuming all remaining gas).

Requirements:

- The divisor cannot be zero.



### min

```solidity
  function min(uint256 x, uint256 y) internal returns(uint256 z)
```




### sqrt

```solidity
  function sqrt(uint256 y) internal returns(uint256 z)
```





___

## Events

