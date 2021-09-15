import { BigNumber, Signer, constants } from "ethers";
import { MockToken, PancakeswapWorker } from "../typechain";
import { ethers, upgrades, waffle } from "hardhat";

import chai from "chai";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;
let deployer: Signer;
let account1: Signer;
let account2: Signer;

let pancakeSwapWorker: PancakeswapWorker;
let baseToken: MockToken;
let token1: MockToken;
let token2: MockToken;

describe("PancakeswapWorker", () => {
  async function fixture() {
    [deployer, account1, account2] = await ethers.getSigners();

    const PancakeswapWorkerFactory = await ethers.getContractFactory("PancakeswapWorker", deployer);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  context("when is initialized", async () => {
    it("should has a correct token0 and token1 addresses", async () => {
      console.log("TODO: Worker test suite");
    });
  });
});
