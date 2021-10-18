import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import BN from "bn.js";
import chai from "chai";
import chainBn from "chai-bn";
import { Signer } from "@ethersproject/abstract-signer";
import { Admin, MockWorker, ProtocolManager } from "../typechain";
import { deployContract, deployProxyContract } from "./helpers";

chai.use(solidity);
chai.use(chainBn(BN));
const { expect } = chai;

describe("Admin contract", () => {
  let deployer: Signer;
  let deployerAddress: string;
  let operator: Signer;
  let operatorAddress: string;

  let Admin: Admin;
  let ProtocolManager: ProtocolManager;

  let MockWorker: MockWorker;

  async function fixture() {
    [deployer, operator] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    [deployerAddress, operatorAddress] = await Promise.all([
      deployer.getAddress(),
      operator.getAddress(),
    ]);

    MockWorker = (await deployContract("MockWorker", [], deployer)) as MockWorker;

    ProtocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[deployerAddress, operatorAddress]],
      deployer
    )) as ProtocolManager;

    await ProtocolManager.approveWorkers([MockWorker.address], true, { from: deployerAddress });

    Admin = (await deployProxyContract("Admin", [ProtocolManager.address], deployer)) as Admin;
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  it("Should disable and enable given farm", async () => {
    const Admin__operator = Admin.connect(operator);

    await Admin__operator.disableFarms([MockWorker.address]);
    expect(await Admin.isFarmEnabled(MockWorker.address)).to.be.false;
    await Admin__operator.enableFarms([MockWorker.address]);
    expect(await Admin.isFarmEnabled(MockWorker.address)).to.be.true;
  });

  it("Should set new fee for given farm", async () => {
    const Admin__operator = Admin.connect(operator);

    await Admin__operator.setFarmsFee([MockWorker.address], "1500");
    expect((await Admin__operator.getFarmFee(MockWorker.address)).toString()).to.be.eq("1500");
  });
});
