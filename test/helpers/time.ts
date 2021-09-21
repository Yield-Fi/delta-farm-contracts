import { parseEther } from "@ethersproject/units";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export async function latest(): Promise<BigNumber> {
  const block = await ethers.provider.getBlock("latest");
  return ethers.BigNumber.from(block.timestamp);
}

export async function latestBlockNumber(): Promise<BigNumber> {
  const block = await ethers.provider.getBlock("latest");
  return ethers.BigNumber.from(block.number);
}

export async function advanceBlock() {
  await ethers.provider.send("evm_mine", []);
}

export async function increase(duration: BigNumber) {
  if (duration.isNegative()) throw Error(`Cannot increase time by a negative amount (${duration})`);

  await ethers.provider.send("evm_increaseTime", [duration.toNumber()]);

  await advanceBlock();
}

export const duration = {
  seconds: function (val: number): BigNumber {
    return ethers.BigNumber.from(String(val));
  },
  minutes: function (val: number): BigNumber {
    return ethers.BigNumber.from(String(val)).mul(this.seconds(60));
  },
  hours: function (val: number): BigNumber {
    return ethers.BigNumber.from(String(val)).mul(this.minutes(60));
  },
  days: function (val: number): BigNumber {
    return ethers.BigNumber.from(String(val)).mul(this.hours(24));
  },
  weeks: function (val: number): BigNumber {
    return ethers.BigNumber.from(String(val)).mul(this.days(7));
  },
  years: function (val: number): BigNumber {
    return ethers.BigNumber.from(String(val)).mul(this.days(365));
  },
};

export async function advanceBlockTo(block: number) {
  let latestBlock = (await latestBlockNumber()).toNumber();

  if (block <= latestBlock) {
    throw new Error("input block exceeds current block");
  }

  while (block > latestBlock) {
    await advanceBlock();
    latestBlock++;
  }
}
