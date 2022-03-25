import { formatEther } from "ethers/lib/utils";
import hre, { ethers, upgrades } from "hardhat";
import { mainnetConfig } from "../configs";
import {
  ERC20Interface__factory,
  PancakeswapWorker__factory,
  ProtocolManager__factory,
} from "../typechain";

async function main() {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: ["0xa1f56ab831841b63efa7bbda92fbad57eebbe5ed"],
  });

  await hre.network.provider.send("hardhat_setBalance", [
    "0xa1f56ab831841b63efa7bbda92fbad57eebbe5ed",
    "0x213557C345825000",
  ]);

  const deployerSigner = await ethers.getSigner("0xa1f56ab831841b63efa7bbda92fbad57eebbe5ed");

  const LiquidateStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyLiquidate",
    deployerSigner
  );

  const ProtocolManager = ProtocolManager__factory.connect(
    mainnetConfig.protocolManager,
    deployerSigner
  );

  const Worker = PancakeswapWorker__factory.connect(
    "0xBEF1cC5318a8504Ce7CD382E8010E38FA1861738",
    deployerSigner
  );

  const Strategy = await upgrades.deployProxy(LiquidateStrategyFactory, [
    mainnetConfig.dex.pancakeswap.RouterV2,
    ProtocolManager.address,
  ]);

  const LStrategy = await Strategy.deployed();

  await ProtocolManager.approveStrategies(
    [
      mainnetConfig.strategies.pancakeswap.AddToPoolWithBaseToken,
      mainnetConfig.strategies.pancakeswap.AddToPoolWithoutBaseToken,
      LStrategy.address,
    ],
    true
  );

  await Worker.setStrategies([
    mainnetConfig.strategies.pancakeswap.AddToPoolWithBaseToken,
    mainnetConfig.strategies.pancakeswap.AddToPoolWithoutBaseToken,
    LStrategy.address,
  ]);

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: ["0x00564541b80c5a065308ca1c93759c5417476f36"],
  });

  const signer = await ethers.getSigner("0x00564541b80c5a065308ca1c93759c5417476f36");

  const BUSD = ERC20Interface__factory.connect(
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    signer
  );

  console.log(
    "BUSD balance before: ",
    formatEther(await BUSD.balanceOf("0x00564541b80c5a065308ca1c93759c5417476f36"))
  );

  const ClientFactory = await ethers.getContractFactory("Client");

  const ClientAsAsh = ClientFactory.attach("0x18ec0bf18d727af80ddd51944255f2f12ecb9744").connect(
    signer
  );

  await ClientAsAsh.withdraw(
    "0x00564541B80C5A065308cA1C93759c5417476f36",
    "0xBEF1cC5318a8504Ce7CD382E8010E38FA1861738",
    "15000000000000000000"
  );

  console.log(
    "BUSD balance after",
    formatEther(await BUSD.balanceOf("0x00564541b80c5a065308ca1c93759c5417476f36"))
  );

  console.log("success");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
