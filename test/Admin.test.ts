import { ethers, waffle } from "hardhat";
import { solidity } from "ethereum-waffle";
import BN from "bn.js";
import chai from "chai";
import chainBn from "chai-bn";
import { Signer } from "@ethersproject/abstract-signer";
import {
  Admin,
  FeeCollector,
  MockToken,
  MockVault,
  MockWorker,
  ProtocolManager,
} from "../typechain";
import { deployContract, deployProxyContract, deployToken } from "./helpers";
import { parseEther } from "@ethersproject/units";
import { AbiCoder, defaultAbiCoder } from "@ethersproject/abi";

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
  let FeeCollector: FeeCollector;
  let MockWorker: MockWorker;
  let MockVault: MockVault;
  let FeeToken: MockToken;

  async function fixture() {
    [deployer, operator] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    [deployerAddress, operatorAddress] = await Promise.all([
      deployer.getAddress(),
      operator.getAddress(),
    ]);

    MockWorker = (await deployContract("MockWorker", [], deployer)) as MockWorker;

    FeeToken = await deployToken(
      {
        name: "feeToken",
        symbol: "FTOK",
        holders: [
          {
            address: deployerAddress,
            amount: parseEther("100"),
          },
        ],
      },
      deployer
    );

    MockVault = (await deployContract("MockVault", [FeeToken.address], deployer)) as MockVault;

    ProtocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[deployerAddress, operatorAddress]],
      deployer
    )) as ProtocolManager;

    FeeCollector = (await deployProxyContract(
      "FeeCollector",
      [FeeToken.address, parseEther("0.1").toString(), ProtocolManager.address],
      deployer
    )) as FeeCollector;

    await ProtocolManager.approveWorkers([MockWorker.address], true, { from: deployerAddress });
    await ProtocolManager.approveVaults([MockVault.address], true);

    Admin = (await deployProxyContract(
      "Admin",
      [ProtocolManager.address, FeeCollector.address],
      deployer
    )) as Admin;

    await ProtocolManager.approveAdminContract(Admin.address);
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

  it("Should collect fee from FeeCollector", async () => {
    /// Transfer funds and register fee by vault on the fee collector
    const FeeToken__deployer = FeeToken.connect(deployer);
    FeeToken__deployer.transfer(FeeCollector.address, parseEther("5"));
    await MockVault.executeTransaction(
      FeeCollector.address,
      "0",
      "registerFees(address[],uint256[])",
      defaultAbiCoder.encode(
        ["address[]", "uint256[]"],
        [[Admin.address], [parseEther("5").toString()]]
      )
    );

    expect((await Admin.feeToCollect()).toString()).to.be.eq(parseEther("5").toString());

    const Admin__operator = Admin.connect(operator);
    await Admin__operator.collectFee(operatorAddress);

    expect((await FeeToken.balanceOf(operatorAddress)).toString()).to.be.eq(
      parseEther("5").toString()
    );
  });
});
