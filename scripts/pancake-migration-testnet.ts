import { ethers } from "hardhat";
import { testnetDevConfig } from "../configs";
import { logger } from "../deploy/utils/logger";

async function main() {
  const [deployer] = await ethers.getSigners();

  const PancakeMasterChef = (await ethers.getContractFactory("PancakeMasterChef", deployer)).attach(
    testnetDevConfig.dex.pancakeswap.MasterChef
  );

  let poolLength = await PancakeMasterChef.poolLength();

  console.log("poolLength", poolLength.toNumber());

  for (let i = 0; i < poolLength.toNumber(); i++) {
    await (await PancakeMasterChef.set(i, 0, false)).wait();
    logger(`Alloc point for pool with id ${i} updated`);
  }

  const TokenFactory = await ethers.getContractFactory("MockToken", deployer);

  const DummyToken = await TokenFactory.deploy("DummyToken", "DUMMY");

  await DummyToken.deployed();

  await (await DummyToken.mint(deployer.address, 100000000)).wait();

  logger(` - DummyToken deployed at ${DummyToken.address} and minted`);

  await (await PancakeMasterChef.set(0, 0, false)).wait();
  await (await PancakeMasterChef.add(1, DummyToken.address, false)).wait();

  logger(` - Master pool was set on MasterChefV1`);

  const lastPoolId = await PancakeMasterChef.poolLength();

  const CAKE = await PancakeMasterChef.cake();

  const MasterChefV2Factory = await ethers.getContractFactory("PancakeMasterChefV2", deployer);

  const MasterChefV2 = await MasterChefV2Factory.deploy(
    PancakeMasterChef.address,
    CAKE,
    lastPoolId.toNumber() - 1,
    deployer.address
  );

  await MasterChefV2.deployed();

  logger(` - Pancake MasterChefV2 deployed at ${MasterChefV2.address}`);

  await (await DummyToken.approve(MasterChefV2.address, 1000000000000)).wait();

  await (await MasterChefV2.init(DummyToken.address, { gasLimit: "910000" })).wait();

  logger(` - MasterChefV2 initialized`);

  poolLength = await PancakeMasterChef.poolLength();

  for (let i = 1; i < poolLength.toNumber() - 1; i++) {
    const pool = await PancakeMasterChef.poolInfo(i);

    await (await MasterChefV2.add(pool.allocPoint, pool.lpToken, true, false)).wait();

    logger(
      `Pool with id ${i} and lpToken ${pool.lpToken} migrated. Id of pool on MasterChefV2 is ${
        i - 1
      }`
    );
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
