import { ethers, network, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { mainnetConfig } from "../configs";
import { formatEther, parseEther } from "ethers/lib/utils";
import { PancakeswapWorkerV2, ProtocolManager__factory } from "../typechain";
import { expect } from "chai";

// Tests have been written to tests deployment process of new version of workers on mainnet
// Run it only on mainnet fork, the network state can be change, tests works for block 17741794
describe.skip("PancakeswapWorkerV2 - tests on bsc fork, block 17741794", () => {
  let protocolOperator: SignerWithAddress;
  let clientOperator: SignerWithAddress;
  let user: SignerWithAddress;

  const deployedWorkers: string[] = [];

  before(async () => {
    // Protocol operator
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xa1f56ab831841b63eFA7BBda92fbaD57eeBbE5eD"],
    });

    await network.provider.send("hardhat_setBalance", [
      "0xa1f56ab831841b63eFA7BBda92fbaD57eeBbE5eD",
      "0x100000000000000000000",
    ]);

    protocolOperator = await ethers.getSigner("0xa1f56ab831841b63eFA7BBda92fbaD57eeBbE5eD");

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xD2347FA9A5A41B51676c73D35ee4DAb926765A94"],
    });

    await network.provider.send("hardhat_setBalance", [
      "0xD2347FA9A5A41B51676c73D35ee4DAb926765A94",
      "0x100000000000000000000",
    ]);

    clientOperator = await ethers.getSigner("0xD2347FA9A5A41B51676c73D35ee4DAb926765A94");

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x00564541b80c5a065308ca1c93759c5417476f36"],
    });

    user = await ethers.getSigner("0x00564541b80c5a065308ca1c93759c5417476f36");

    const AddToPoolWithBaseTokenFactory = await ethers.getContractFactory(
      "PancakeswapStrategyAddToPoolWithBaseToken",
      protocolOperator
    );

    const AddToPoolWithBaseTokenStrategy = await upgrades.deployProxy(
      AddToPoolWithBaseTokenFactory,
      [mainnetConfig.dex.pancakeswap.RouterV2, mainnetConfig.protocolManager]
    );

    await AddToPoolWithBaseTokenStrategy.deployed();

    const AddToPoolWithoutBaseTokenStrategyFactory = await ethers.getContractFactory(
      "PancakeswapStrategyAddToPoolWithoutBaseToken",
      protocolOperator
    );

    const AddToPoolWithoutBaseTokenStrategy = await upgrades.deployProxy(
      AddToPoolWithoutBaseTokenStrategyFactory,
      [mainnetConfig.dex.pancakeswap.RouterV2, mainnetConfig.protocolManager]
    );

    AddToPoolWithoutBaseTokenStrategy.deployed();

    const LiquidateStrategyFactory = await ethers.getContractFactory(
      "PancakeswapStrategyLiquidate",
      protocolOperator
    );

    const LiquidateStrategy = await upgrades.deployProxy(LiquidateStrategyFactory, [
      mainnetConfig.dex.pancakeswap.RouterV2,
      mainnetConfig.protocolManager,
    ]);

    const ProtocolManager = ProtocolManager__factory.connect(
      mainnetConfig.protocolManager,
      protocolOperator
    );

    await ProtocolManager.approveStrategies(
      [
        AddToPoolWithBaseTokenStrategy.address,
        AddToPoolWithoutBaseTokenStrategy.address,
        LiquidateStrategy.address,
      ],
      true
    );

    for (const vault of mainnetConfig.vaults) {
      console.log(`-> Deploying workers for ${vault.name}`);
      for (const worker of vault.workers.pancakeV2) {
        console.log(`  - Deploying ${worker.name}...`);
        const PancakeswapWorkerFactory = await ethers.getContractFactory(
          "PancakeswapWorkerV2",
          protocolOperator
        );

        const PancakeswapWorker = (await upgrades.deployProxy(PancakeswapWorkerFactory, [
          worker.name,
          vault.address,
          mainnetConfig.baseToken,
          mainnetConfig.dex.pancakeswap.MasterChefV2,
          mainnetConfig.dex.pancakeswap.RouterV2,
          worker.poolId,
          [mainnetConfig.tokens.CAKE, mainnetConfig.baseToken],
          parseEther(worker.defaultHarvestThreshold),
          mainnetConfig.defaultTreasuryFeeBps,
          mainnetConfig.protocolManager,
        ])) as PancakeswapWorkerV2;

        await PancakeswapWorker.deployed();
        deployedWorkers.push(PancakeswapWorker.address);

        await (
          await PancakeswapWorker.setStrategies([
            AddToPoolWithBaseTokenStrategy.address,
            AddToPoolWithoutBaseTokenStrategy.address,
            LiquidateStrategy.address,
          ])
        ).wait();

        console.log(`  - ${worker.name} deployed at ${PancakeswapWorker.address}`);
      }
    }

    await ProtocolManager.approveWorkers(deployedWorkers, true);
  });

  it("Should deployed all workers with correct parameters", async () => {
    for (const [index, workerAddress] of deployedWorkers.entries()) {
      const Worker = await ethers.getContractAt("PancakeswapWorkerV2", workerAddress);

      const workerData = mainnetConfig.vaults[0].workers.pancakeV2[index];

      expect(await Worker.getName()).to.equal(
        workerData.name,
        `Invalid worker name for ${workerData.name}`
      );
      expect((await Worker.baseToken()).toLowerCase()).to.equal(
        mainnetConfig.baseToken.toLowerCase(),
        `Invalid base token for ${workerData.name}`
      );
      expect((await Worker.token0()).toLowerCase()).to.equal(
        workerData.token0.toLowerCase(),
        `Invalid token0 for ${workerData.name}`
      );
      expect((await Worker.token1()).toLowerCase()).to.equal(
        workerData.token1.toLowerCase(),
        `Invalid token1 for ${workerData.name}`
      );
    }
  });

  it("Workers are enabled default", async () => {
    for (const workerAddress of deployedWorkers) {
      const Worker = await ethers.getContractAt("PancakeswapWorkerV2", workerAddress);

      expect(await Worker.isWorkerEnabled()).to.equal(true, "Worker is enabled");
    }
  });

  it("Client can enable farms", async () => {
    const ClientContract = (
      await ethers.getContractAt("Client", mainnetConfig.clients[0].address)
    ).connect(clientOperator);

    for (const workerAddress of deployedWorkers) {
      expect(await ClientContract.isFarmEnabled(workerAddress)).to.equal(
        false,
        "Worker is enabled"
      );
    }

    await ClientContract.enableFarms(deployedWorkers);

    for (const workerAddress of deployedWorkers) {
      expect(await ClientContract.isFarmEnabled(workerAddress)).to.equal(
        true,
        "Worker is disabled"
      );
    }
  });

  it("User should can withdraw funds from old farms", async () => {
    const ClientContractAsUser = (
      await ethers.getContractAt("Client", mainnetConfig.clients[0].address)
    ).connect(user);

    for (const workerData of mainnetConfig.vaults[0].workers.pancake) {
      let amountToWithdraw = Number(
        formatEther(await ClientContractAsUser.amountToWithdraw(workerData.address, user.address))
      );

      if (amountToWithdraw <= 0) {
        console.log(`User doesn't have funds in ${workerData.name}`);
        continue;
      }

      await ClientContractAsUser.withdraw(user.address, workerData.address, 0);

      amountToWithdraw = Number(
        formatEther(await ClientContractAsUser.amountToWithdraw(workerData.address, user.address))
      );

      console.log(`User  withdrawn funds from ${workerData.name}`);

      expect(amountToWithdraw).to.be.equal(0, `Invalid amount to withdraw from ${workerData.name}`);
    }
  }).timeout(5000000);

  it("User can deposit BUSD into each new farm", async () => {
    const ClientContractAsUser = (
      await ethers.getContractAt("Client", mainnetConfig.clients[0].address)
    ).connect(user);

    for (const [index, workerAddress] of deployedWorkers.entries()) {
      const workerData = mainnetConfig.vaults[0].workers.pancakeV2[index];

      await ClientContractAsUser.deposit(user.address, workerAddress, parseEther("20"));

      console.log(`User deposited 20 BUSD into farm ${workerData.name}`);

      const amountToWithdraw = Number(
        formatEther(await ClientContractAsUser.amountToWithdraw(workerAddress, user.address))
      );

      console.log(`User can withdraw ${amountToWithdraw} BUSD`);

      expect(amountToWithdraw).to.be.greaterThanOrEqual(
        18,
        `Invalid amount to withdraw from ${workerData.name}`
      );
    }
  }).timeout(5000000);

  it("User can withdraw funds from new farms", async () => {
    const ClientContractAsUser = (
      await ethers.getContractAt("Client", mainnetConfig.clients[0].address)
    ).connect(user);

    for (const [index, workerAddress] of deployedWorkers.entries()) {
      const workerData = mainnetConfig.vaults[0].workers.pancakeV2[index];

      await ClientContractAsUser.withdraw(user.address, workerAddress, 0);

      const amountToWithdraw = Number(
        formatEther(await ClientContractAsUser.amountToWithdraw(workerAddress, user.address))
      );

      console.log(`User  withdrawn funds from ${workerData.name}`);

      expect(amountToWithdraw).to.be.equal(0, `Invalid amount to withdraw from ${workerData.name}`);
    }
  }).timeout(5000000);
});
