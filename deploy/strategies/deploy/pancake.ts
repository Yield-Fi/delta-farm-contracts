import { ethers, upgrades } from "hardhat";
import { DeployFunction } from "hardhat-deploy/types";
import { PancakeswapAddBaseTokenOnlyStrategy__factory } from "../../../typechain";

const PANCAKE_TESTNET_ROUTER = "0x367633909278A3C91f4cB130D8e56382F00D1071";

const func: DeployFunction = async () => {
  const PancakeSwapAddBaseTokenOnlyStrategy = (await ethers.getContractFactory(
    "PancakeswapAddBaseTokenOnlyStrategy",
    (
      await ethers.getSigners()
    )[0]
  )) as PancakeswapAddBaseTokenOnlyStrategy__factory;

  const addBaseTokenOnlyStrategy = await upgrades.deployProxy(
    PancakeSwapAddBaseTokenOnlyStrategy,
    [PANCAKE_TESTNET_ROUTER],
    { kind: "uups" }
  );

  await addBaseTokenOnlyStrategy.deployed();

  console.log(
    `PancakeswapAddBaseTokenOnlyStrategy deployed at ${addBaseTokenOnlyStrategy.address}`
  );
};

export default func;
func.tags = ["PancakeStrategies"];
