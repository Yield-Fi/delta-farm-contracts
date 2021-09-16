import {
  PancakeMasterChef,
  PancakeMasterChef__factory,
  PancakeswapWorker,
  PancakeswapWorker__factory,
} from "../../typechain";

import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export class Worker02Helper {
  private worker: PancakeswapWorker;
  private masterChef: PancakeMasterChef;

  constructor(_workerAddress: string, _masterChefAddress: string) {
    this.worker = PancakeswapWorker__factory.connect(_workerAddress, ethers.provider);
    this.masterChef = PancakeMasterChef__factory.connect(_masterChefAddress, ethers.provider);
  }

  public computeShareToBalance(
    share: BigNumber,
    totalShare: BigNumber,
    totalBalance: BigNumber
  ): BigNumber {
    if (totalShare.eq(0)) return share;
    return share.mul(totalBalance).div(totalShare);
  }

  public computeBalanceToShare(
    balance: BigNumber,
    totalShare: BigNumber,
    totalBalance: BigNumber
  ): BigNumber {
    if (totalShare.eq(0)) return balance;
    return balance.mul(totalShare).div(totalBalance);
  }
}
