import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getConfig } from "../utils/config";
import { ethers } from "hardhat";
import { logger } from "../utils/logger";
import { parseEther } from "@ethersproject/units";

const func: DeployFunction = async function ({ network }: HardhatRuntimeEnvironment) {
  if (network.name === "mainnet") {
    console.log("This deployment script should be run against testnet only");
    return;
  }

  const CAKE_REWARD_PER_BLOCK = ethers.utils.parseEther("3");

  const [deployer] = await ethers.getSigners();
  const config = getConfig();

  logger("--> Deploying Pancakeswap v2...");

  const PancakeFactoryFactory = await ethers.getContractFactory("PancakeFactory", deployer);

  const PancakeFactory = await PancakeFactoryFactory.deploy(deployer.address);

  await PancakeFactory.deployed();

  logger(` - PancakeFactory is deployed at ${PancakeFactory.address}`);

  const PancakeRouterFactory = await ethers.getContractFactory("PancakeRouterV2", deployer);

  const PancakeRouter = await PancakeRouterFactory.deploy(
    PancakeFactory.address,
    config.tokens.WBNB
  );

  await PancakeRouter.deployed();

  logger(` - PancakeRouter deployed at ${PancakeRouter.address}`);

  const CAKEFactory = await ethers.getContractFactory("CakeToken", deployer);

  const CAKE = await CAKEFactory.deploy();

  await CAKE.deployed();

  await CAKE["mint(address,uint256)"](deployer.address, parseEther("100000000"));

  logger(` - Cake token deployed at ${CAKE.address}`);

  const SYRUPFactory = await ethers.getContractFactory("SyrupBar", deployer);

  const SYRUP = await SYRUPFactory.deploy(CAKE.address);

  logger(` - Syrup Bar token deployed at ${SYRUP.address}`);

  const MasterChefFactory = await ethers.getContractFactory("PancakeMasterChef", deployer);

  const MasterChef = await MasterChefFactory.deploy(
    CAKE.address,
    SYRUP.address,
    deployer.address,
    CAKE_REWARD_PER_BLOCK,
    0
  );

  logger(` - Pancake MasterChef deployed at ${MasterChef.address}`);

  await CAKE.transferOwnership(MasterChef.address, { gasLimit: "210000" });
  await SYRUP.transferOwnership(MasterChef.address, { gasLimit: "210000" });
};

export default func;
func.tags = ["PancakeswapV2"];
