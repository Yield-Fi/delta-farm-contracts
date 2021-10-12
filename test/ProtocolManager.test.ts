import "@openzeppelin/test-helpers";

import { Signer } from "ethers";
import {
  CakeToken,
  FeeCollector,
  MockWBNB,
  PancakeFactory,
  PancakeMasterChef,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  SyrupBar,
  Vault,
  VaultConfig,
  MockToken,
  PancakeswapWorker,
  ProtocolManager,
  Client,
} from "../typechain";
import { ethers, waffle } from "hardhat";
import { deployToken, deployWBNB } from "./helpers/deployToken";
import chai from "chai";
import { deployPancakeV2, deployProxyContract } from "./helpers";
import { deployPancakeWorker } from "./helpers/deployWorker";
import { deployVault } from "./helpers/deployVault";
import { solidity } from "ethereum-waffle";
import { WrappedNativeTokenRelayer } from "../typechain/WrappedNativeTokenRelayer";

chai.use(solidity);
const { expect } = chai;
describe("ProtocolManager", async () => {
  const CAKE_REWARD_PER_BLOCK = ethers.utils.parseEther("0.076");
  const POOL_ID = 1;
  const REINVEST_BOUNTY_BPS = "100";

  // DEX (PCS)
  let factory: PancakeFactory;
  let router: PancakeRouterV2;
  let masterChef: PancakeMasterChef;
  let pancakeswapWorker01: PancakeswapWorker;
  let pancakeswapWorker02: PancakeswapWorker;
  let lp: PancakePair;
  let mockWBNB: MockWBNB;

  // Tokens
  let baseToken: MockToken;
  let targetToken: MockToken;
  let cake: CakeToken;
  let syrup: SyrupBar;

  // BC
  let feeCollector: FeeCollector;

  // Client
  let exampleClient: Client;

  // Signers
  let deployer: Signer;
  let evilUser: Signer;

  let deployerAddress: string;

  // Protocol
  let vault: Vault;
  let vaultConfig: VaultConfig;
  let wNativeRelayer: WrappedNativeTokenRelayer;

  // Connected entities (signer to target entity)
  let protocolManager: ProtocolManager;
  let protocolManagerAsEvilUser: ProtocolManager;

  async function fixture() {
    [deployer, evilUser] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();

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

    [factory, router, cake, syrup, masterChef] = await deployPancakeV2(
      mockWBNB,
      CAKE_REWARD_PER_BLOCK,
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
    [vault, vaultConfig, wNativeRelayer] = await deployVault(
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

    await masterChef.add(1, lp.address, true);

    /// Setup PancakeswapWorker
    pancakeswapWorker01 = await deployPancakeWorker(
      vault,
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

    pancakeswapWorker02 = await deployPancakeWorker(
      vault,
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
        [deployerAddress],
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
