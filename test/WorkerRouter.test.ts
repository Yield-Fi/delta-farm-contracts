import "@openzeppelin/test-helpers";

import { Signer } from "ethers";
import {
  CakeToken,
  BountyCollector,
  MockWBNB,
  PancakeFactory,
  PancakeMasterChef,
  PancakePair,
  PancakePair__factory,
  PancakeRouterV2,
  SyrupBar,
  Vault,
  VaultConfig,
  WNativeRelayer,
  WorkerRouter,
  MockToken,
  PancakeswapWorker,
} from "../typechain";
import { ethers, waffle } from "hardhat";
import { deployToken, deployWBNB } from "./helpers/deployToken";
import chai from "chai";
import { deployPancakeV2, deployProxyContract } from "./helpers";
import { deployPancakeWorker } from "./helpers/deployWorker";
import { deployVault } from "./helpers/deployVault";
import { solidity } from "ethereum-waffle";

chai.use(solidity);
const { expect } = chai;
describe("WorkerRouter", async () => {
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
  let bountyCollector: BountyCollector;

  // WorkerRouter
  let workerRouter: WorkerRouter;

  // Signers
  let deployer: Signer;
  let evilUser: Signer;

  let deployerAddress: string;

  // Protocol
  let vault: Vault;
  let vaultConfig: VaultConfig;
  let wNativeRelayer: WNativeRelayer;

  // Connected entities (signer to target entity)
  let workerRouterAsDeployer: WorkerRouter;
  let workerRouterAsEvilUser: WorkerRouter;

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

    bountyCollector = (await deployProxyContract(
      "BountyCollector",
      [baseToken.address, "500"],
      deployer
    )) as BountyCollector;

    // Treasury acc = yieldFi protocol owner
    [vault, vaultConfig, wNativeRelayer] = await deployVault(
      mockWBNB,
      bountyCollector.address,
      deployerAddress,
      baseToken,
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
      deployer
    );

    workerRouter = (await deployProxyContract("WorkerRouter", [], deployer)) as WorkerRouter;

    await workerRouter.whitelistOperators([deployerAddress], true);

    workerRouterAsDeployer = workerRouter.connect(deployer);
    workerRouterAsEvilUser = workerRouter.connect(evilUser);
  }

  beforeEach(async () => {
    await waffle.loadFixture(fixture);
  });

  context("called by whitelisted operator", async () => {
    it("should add new worker properly - manual", async () => {
      await workerRouterAsDeployer.addWorkerManual(
        baseToken.address,
        targetToken.address,
        pancakeswapWorker01.address,
        false
      );

      expect(
        await workerRouterAsDeployer.protocolWorkers(baseToken.address, targetToken.address)
      ).to.be.eql(pancakeswapWorker01.address);
    });

    it("should add new worker properly - auto discover", async () => {
      await workerRouterAsDeployer.addWorkerAutoDiscover(pancakeswapWorker01.address, false);

      expect(
        await workerRouterAsDeployer.protocolWorkers(baseToken.address, targetToken.address)
      ).to.be.eql(pancakeswapWorker01.address);
    });

    it("should reject worker addition if slot has already been occupied - manual", async () => {
      // First addition - ok
      await workerRouterAsDeployer.addWorkerManual(
        baseToken.address,
        targetToken.address,
        pancakeswapWorker01.address,
        false
      );

      await expect(
        workerRouterAsDeployer.addWorkerManual(
          baseToken.address,
          targetToken.address,
          pancakeswapWorker01.address,
          false
        )
      ).to.be.revertedWith(
        "WorkerRouter: Slot already occupied, set 'overwrite' flag to 'true' to overwrite current mapping"
      );
    });

    it("should reject worker addition if slot has already been occupied - auto discover", async () => {
      await workerRouterAsDeployer.addWorkerManual(
        baseToken.address,
        targetToken.address,
        pancakeswapWorker01.address,
        false
      );

      await expect(
        workerRouterAsDeployer.addWorkerAutoDiscover(pancakeswapWorker01.address, false)
      ).to.be.revertedWith(
        "WorkerRouter: Slot already occupied, set 'overwrite' flag to 'true' to overwrite current mapping"
      );
    });

    it("should overwrite worker if proper flag has been set - manual", async () => {
      await workerRouterAsDeployer.addWorkerManual(
        baseToken.address,
        targetToken.address,
        pancakeswapWorker01.address,
        false
      );

      await workerRouterAsDeployer.addWorkerManual(
        baseToken.address,
        targetToken.address,
        pancakeswapWorker02.address,
        true
      );

      expect(
        await workerRouterAsDeployer.protocolWorkers(baseToken.address, targetToken.address)
      ).to.be.eql(pancakeswapWorker02.address);
    });

    it("should overwrite worker if proper flag has been set - auto discover", async () => {
      await workerRouterAsDeployer.addWorkerAutoDiscover(pancakeswapWorker01.address, false);

      await workerRouterAsDeployer.addWorkerAutoDiscover(pancakeswapWorker02.address, true);

      expect(
        await workerRouterAsDeployer.protocolWorkers(baseToken.address, targetToken.address)
      ).to.be.eql(pancakeswapWorker02.address);
    });

    /**
     * @notice No matter by which method worker has been added.
     */
    it("should remove worker from the register - manual", async () => {
      await workerRouterAsDeployer.addWorkerAutoDiscover(pancakeswapWorker01.address, false);

      // Check if set properly
      expect(
        await workerRouterAsDeployer.protocolWorkers(baseToken.address, targetToken.address)
      ).to.be.eql(pancakeswapWorker01.address);

      await workerRouterAsDeployer.removeWorkerManual(baseToken.address, targetToken.address);

      expect(
        await workerRouterAsDeployer.protocolWorkers(baseToken.address, targetToken.address)
      ).to.be.eql(ethers.constants.AddressZero);
    });

    it("should remove worker from the register - auto discover", async () => {
      await workerRouterAsDeployer.addWorkerAutoDiscover(pancakeswapWorker01.address, false);

      // Check if set properly
      expect(
        await workerRouterAsDeployer.protocolWorkers(baseToken.address, targetToken.address)
      ).to.be.eql(pancakeswapWorker01.address);

      await workerRouterAsDeployer.removeWorkerAutoDiscover(pancakeswapWorker01.address);

      expect(
        await workerRouterAsDeployer.protocolWorkers(baseToken.address, targetToken.address)
      ).to.be.eql(ethers.constants.AddressZero);
    });
  });

  context("called by not whitelisted operator", async () => {
    it("should revert upon worker addition - manual", async () => {
      await expect(
        workerRouterAsEvilUser.addWorkerManual(
          baseToken.address,
          targetToken.address,
          pancakeswapWorker01.address,
          false
        )
      ).to.be.revertedWith("WorkerRouter: Operator not whitelisted");
    });

    it("should revert upon worker addition - auto discover", async () => {
      await expect(
        workerRouterAsEvilUser.addWorkerAutoDiscover(pancakeswapWorker01.address, false)
      ).to.be.revertedWith("WorkerRouter: Operator not whitelisted");
    });

    /**
     * @notice No matter by which method worker has been added.
     */
    it("should remove worker from the register - manual", async () => {
      await workerRouterAsDeployer.addWorkerAutoDiscover(pancakeswapWorker01.address, false);

      // Check if set properly
      expect(
        await workerRouterAsDeployer.protocolWorkers(baseToken.address, targetToken.address)
      ).to.be.eql(pancakeswapWorker01.address);

      await expect(
        workerRouterAsEvilUser.removeWorkerManual(baseToken.address, targetToken.address)
      ).to.be.revertedWith("WorkerRouter: Operator not whitelisted");
    });

    it("should remove worker from the register - auto discover", async () => {
      await workerRouterAsDeployer.addWorkerAutoDiscover(pancakeswapWorker01.address, false);

      // Check if set properly
      expect(
        await workerRouterAsDeployer.protocolWorkers(baseToken.address, targetToken.address)
      ).to.be.eql(pancakeswapWorker01.address);

      await expect(
        workerRouterAsEvilUser.removeWorkerAutoDiscover(pancakeswapWorker01.address)
      ).to.be.revertedWith("WorkerRouter: Operator not whitelisted");
    });
  });
});
