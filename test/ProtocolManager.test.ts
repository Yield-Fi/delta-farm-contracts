import { Signer } from "@ethersproject/abstract-signer";
import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { ProtocolManager, ProtocolManager__factory } from "../typechain";
import { deployProxyContract } from "./helpers";

describe("Protocol manager", () => {
  let deployer: Signer;

  let account1: Signer;
  let account1Address: string;

  let ProtocolManager: ProtocolManager;
  let ProtocolManager__deployer: ProtocolManager;

  const fixtures = async () => {
    [deployer, account1] = await ethers.getSigners();

    [account1Address] = await Promise.all([account1.getAddress()]);

    ProtocolManager = (await deployProxyContract(
      "ProtocolManager",
      [],
      deployer
    )) as ProtocolManager;

    ProtocolManager__deployer = ProtocolManager__factory.connect(ProtocolManager.address, deployer);
  };

  beforeEach(async () => {
    await waffle.loadFixture(fixtures);
  });

  it("should manage client contract's approval", async () => {
    await ProtocolManager__deployer.approveClientContract(account1Address, true);

    expect(await ProtocolManager__deployer.isApprovedClientContract(account1Address)).to.be.eq(
      true
    );

    await ProtocolManager__deployer.approveClientContract(account1Address, false);

    expect(await ProtocolManager__deployer.isApprovedClientContract(account1Address)).to.be.eq(
      false
    );
  });
});
