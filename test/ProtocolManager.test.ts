import "@openzeppelin/test-helpers";

import { Signer } from "ethers";
import {
  CakeToken,
  FeeCollector,
  MockWBNB,
  PancakeFactory,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  Vault,
  MockToken,
  PancakeswapWorker,
  ProtocolManager,
  Client,
  PancakeMasterChefV2,
} from "../typechain";
import { ethers, waffle } from "hardhat";
import { deployToken, deployWBNB } from "./helpers/deployToken";
import chai from "chai";
import { deployPancakeV2, deployProxyContract } from "./helpers";
import { deployPancakeWorkerV2 } from "./helpers/deployWorker";
import { deployVault } from "./helpers/deployVault";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;
describe("ProtocolManager", async () => {
  const POOL_ID = 0;
  const REINVEST_BOUNTY_BPS = "100";

  // DEX (PCS)
  let factory: PancakeFactory;
  let router: PancakeRouterV2;
  let masterChef: PancakeMasterChefV2;
  let pancakeswapWorker01: PancakeswapWorker;
  let pancakeswapWorker02: PancakeswapWorker;
  let lp: PancakePair;
  let mockWBNB: MockWBNB;

  // Tokens
  let baseToken: MockToken;
  let targetToken: MockToken;
  let cake: CakeToken;

  // BC
  let feeCollector: FeeCollector;

  // Client
  let exampleClient: Client;

  // Signers
  let deployer: Signer;
  let evilUser: Signer;
  let clientOperator: Signer;

  let deployerAddress: string;
  let clientOperatorAddress: string;

  // Protocol
  let vault: Vault;

  // Connected entities (signer to target entity)
  let protocolManager: ProtocolManager;
  let protocolManagerAsEvilUser: ProtocolManager;

  async function fixture() {
    [deployer, evilUser, clientOperator] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    clientOperatorAddress = await clientOperator.getAddress();

    baseToken = await deployToken(
      {
        name: "BASETOKEN",
        symbol: "BTOKEN",
        holders: [{ address: deployerAddress, amount: ethers.utils.parseEther("1000") }],
      },
      deployer
    );

    targetToken = await deployToken(
      {
        name: "TARGETTOKEN",
        symbol: "TTOKEN",
        holders: [{ address: deployerAddress, amount: ethers.utils.parseEther("1000") }],
      },
      deployer
    );

    mockWBNB = await deployWBNB(deployer);

    [factory, router, cake, , masterChef] = await deployPancakeV2(
      mockWBNB,
      [{ address: deployerAddress, amount: ethers.utils.parseEther("100") }],
      deployer
    );

    protocolManager = (await deployProxyContract(
      "ProtocolManager",
      [[deployerAddress]],
      deployer
    )) as ProtocolManager;

    feeCollector = (await deployProxyContract(
      "FeeCollector",
      [baseToken.address, "500", protocolManager.address],
      deployer
    )) as FeeCollector;

    // Treasury acc = yieldFi protocol owner
    [vault] = await deployVault(
      mockWBNB,
      baseToken,
      protocolManager.address,
      feeCollector.address,
      deployerAddress,
      deployer
    );

    // Setup BTOKEN-FTOKEN pair on Pancakeswap
    // Add lp to masterChef's pool
    await factory.createPair(baseToken.address, targetToken.address);
    lp = PancakePair__factory.connect(
      await factory.getPair(targetToken.address, baseToken.address),
      deployer
    );

    await masterChef.add(1, lp.address, true, true);

    /// Setup PancakeswapWorker
    pancakeswapWorker01 = await deployPancakeWorkerV2(
      vault,
      "pancakeswapWorker01",
      baseToken,
      masterChef,
      router,
      POOL_ID,
      [cake.address, mockWBNB.address, baseToken.address],
      0,
      REINVEST_BOUNTY_BPS,
      protocolManager.address,
      deployer
    );

    pancakeswapWorker02 = await deployPancakeWorkerV2(
      vault,
      "pancakeswapWorker02",
      baseToken,
      masterChef,
      router,
      POOL_ID,
      [cake.address, mockWBNB.address, baseToken.address],
      0,
      REINVEST_BOUNTY_BPS,
      protocolManager.address,
      deployer
    );

    // Clients
    exampleClient = (await deployProxyContract(
      "Client",
      [
        "Binance",
        "Binance Client",
        protocolManager.address,
        feeCollector.address,
        [clientOperatorAddress],
        [ethers.constants.AddressZero], // Additional withdrawer
      ],
      deployer
    )) as Client;

    protocolManagerAsEvilUser = protocolManager.connect(evilUser);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  context("client contracts approval", async () => {
    it("should manage client contract's approval", async () => {
      await protocolManager.approveClients([exampleClient.address], true);

      expect(await protocolManager.approvedClients(exampleClient.address)).to.be.eq(true);

      await protocolManager.approveClients([exampleClient.address], false);

      expect(await protocolManager.approvedClients(exampleClient.address)).to.be.eq(false);
    });
  });

  context("called by whitelisted operator", async () => {
    it("should add new worker properly", async () => {
      await protocolManager.approveWorkers([pancakeswapWorker01.address], true);

      expect(await protocolManager.approvedWorkers(pancakeswapWorker01.address)).to.be.eql(true);
    });

    /**
     * @notice No matter by which method worker has been added.
     */
    it("should remove worker from the register", async () => {
      await protocolManager.approveWorkers([pancakeswapWorker01.address], true);

      // Check if set properly
      expect(await protocolManager.approvedWorkers(pancakeswapWorker01.address)).to.be.eql(true);

      await protocolManager.approveWorkers([pancakeswapWorker01.address], false);

      expect(await protocolManager.approvedWorkers(pancakeswapWorker01.address)).to.be.eql(false);
    });

    it("should approve and remove new vault properly including token-to-vault mapping", async () => {
      // Addition
      await protocolManager.approveVaults([vault.address], true);

      expect(await protocolManager.approvedVaults(vault.address)).to.be.eq(true);
      expect(await protocolManager.tokenToVault(await vault.token())).to.be.eql(vault.address);

      // Removal
      await protocolManager.approveVaults([vault.address], false);

      expect(await protocolManager.approvedVaults(vault.address)).to.be.eq(false);
      expect(await protocolManager.tokenToVault(await vault.token())).to.be.eql(
        ethers.constants.AddressZero
      );
    });
  });

  context("called by not whitelisted operator", async () => {
    it("should revert upon worker addition", async () => {
      await expect(
        protocolManagerAsEvilUser.approveWorkers([pancakeswapWorker01.address], true)
      ).to.be.revertedWith("ProtocolManager: Operator not whitelisted");
    });

    /**
     * @notice No matter by which method worker has been added.
     */
    it("should revert upon worker removal", async () => {
      await protocolManager.approveWorkers([pancakeswapWorker01.address], true);

      // Check if set properly
      expect(await protocolManager.approvedWorkers(pancakeswapWorker01.address)).to.be.eql(true);

      await expect(
        protocolManagerAsEvilUser.approveWorkers([pancakeswapWorker01.address], false)
      ).to.be.revertedWith("ProtocolManager: Operator not whitelisted");
    });
  });
});
