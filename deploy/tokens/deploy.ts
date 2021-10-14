import { parseEther } from "@ethersproject/units";
import { ethers, upgrades } from "hardhat";

import { DeployFunction } from "hardhat-deploy/types";
import { MockToken, MockToken__factory } from "../../typechain";
import { logger } from "../utils/logger";

const deployFun: DeployFunction = async function () {
  const [deployer] = await ethers.getSigners();

  const tokensToDeploy = ["BUSD", "USDT", "ETH", "USDC", "ADA", "DAI", "BTC"];
  const amountToMint = parseEther("100000000");

  const MockTokenFactory = (await ethers.getContractFactory(
    "MockToken",
    deployer
  )) as MockToken__factory;

  logger("---> Deploying test tokens... <---");

  for (const token of tokensToDeploy) {
    const MockToken = (await upgrades.deployProxy(MockTokenFactory, [
      `${token} test token`,
      token,
    ])) as MockToken;

    await MockToken.deployed();

    await MockToken.mint(deployer.address, amountToMint);

    logger(`- ${token}: ${MockToken.address}`);
  }
};

export default deployFun;
deployFun.tags = ["TestTokens"];
