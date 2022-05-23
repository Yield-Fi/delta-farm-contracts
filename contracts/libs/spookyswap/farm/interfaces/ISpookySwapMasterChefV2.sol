// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";

interface ISpookySwapMasterChefV2 {
    function BOO() external returns(IERC20);

    function deposit(uint pid, uint amount) external;

    function withdraw(uint pid, uint amount) external;

    function pendingBOO(uint _pid, address _user) external view returns (uint pending);

    function userInfo(uint _pid, address _user) external view returns (uint, uint);

    function poolInfo(uint256 _pid) external view returns (uint128, uint64, uint64);

    function lpToken(uint256 _pid) external view returns (IERC20);
}
