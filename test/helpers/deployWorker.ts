import { BigNumberish, Signer } from "ethers";
import {
  MockToken,
  PancakeMasterChef,
  PancakeMasterChefV2,
  PancakeRouterV2,
  PancakeswapWorker,
  PancakeswapWorkerV2,
  PancakeswapWorker__factory,
  PancakeswapWorkerV2__factory,
  Vault,
} from "../../typechain";
import { ethers, upgrades } from "hardhat";

export const deployPancakeWorker = async (
  vault: Vault,
  name: string,
  baseToken: MockToken,
  masterChef: PancakeMasterChef,
  router: PancakeRouterV2,
  poolId: number,
  reinvestPath: string[],
  reinvestThreshold: BigNumberish,
  treasuryFeeBps: BigNumberish,
  protocolManager: string,
  deployer: Signer
): Promise<PancakeswapWorker> => {
  const PancakeswapWorker = (await ethers.getContractFactory(
    "PancakeswapWorker",
    deployer
  )) as PancakeswapWorker__factory;
  const pancakeswapWorker = (await upgrades.deployProxy(PancakeswapWorker, [
    name,
    vault.address,
    baseToken.address,
    masterChef.address,
    router.address,
    poolId,
    reinvestPath,
    reinvestThreshold,
    treasuryFeeBps,
    protocolManager,
  ])) as PancakeswapWorker;

  await pancakeswapWorker.deployed();

  return pancakeswapWorker;
};

export const deployPancakeWorkerV2 = async (
  vault: Vault,
  name: string,
  baseToken: MockToken,
  masterChef: PancakeMasterChefV2,
  router: PancakeRouterV2,
  poolId: number,
  reinvestPath: string[],
  reinvestThreshold: BigNumberish,
  treasuryFeeBps: BigNumberish,
  protocolManager: string,
  deployer: Signer
): Promise<PancakeswapWorkerV2> => {
  const PancakeswapWorkerV2Factory = (await ethers.getContractFactory(
    "PancakeswapWorkerV2",
    deployer
  )) as PancakeswapWorkerV2__factory;
  const pancakeswapWorkerV2 = (await upgrades.deployProxy(PancakeswapWorkerV2Factory, [
    name,
    vault.address,
    baseToken.address,
    masterChef.address,
    router.address,
    poolId,
    reinvestPath,
    reinvestThreshold,
    treasuryFeeBps,
    protocolManager,
  ])) as PancakeswapWorkerV2;

  await pancakeswapWorkerV2.deployed();

  return pancakeswapWorkerV2;
};
