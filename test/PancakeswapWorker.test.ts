import { ethers, upgrades, waffle } from "hardhat";
import { Signer, constants, BigNumber } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { MockToken, PancakeswapWorker2 } from "../typechain";

chai.use(solidity);
const { expect } = chai;
let deployer: Signer;
let account1: Signer;
let account2: Signer;

let pancakeSwapWorker: PancakeswapWorker2;
let baseToken: MockToken;
let token1: MockToken;
let token2: MockToken;

describe("PancakeswapWorker", () => {
  async function fixture() {
    [deployer, account1, account2] = await ethers.getSigners();

    const PancakeswapWorkerFactory = await ethers.getContractFactory(
      "PancakeswapWorker2",
      deployer
    );
    pancakeSwapWorker = await PancakeswapWorkerFactory.deploy();
    await pancakeSwapWorker.deployed();
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  context("when is initialized", async () => {
    it("should has a correct token0 and token1 addresses", async () => {});
  });
});
