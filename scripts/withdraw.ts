import hre, { ethers } from "hardhat";

async function main() {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [
      "0x00564541b80c5a065308ca1c93759c5417476f36",
      "0xa1f56ab831841b63efa7bbda92fbad57eebbe5ed",
    ],
  });

  const deployerSigner = await ethers.getSigner("0xa1f56ab831841b63efa7bbda92fbad57eebbe5ed");

  const LiquidateStrategyFactory = await ethers.getContractFactory(
    "PancakeswapStrategyLiquidate",
    deployerSigner
  );

  const LiquidateStrategy = await upgrades.upgradeProxy(
    "0x95e64dD7494f797C63C03ed0e74D778ae279a31B",
    LiquidateStrategyFactory
  );

  await LiquidateStrategy.deployed();

  const signer = await ethers.getSigner("0x00564541b80c5a065308ca1c93759c5417476f36");

  const ClientFactory = await ethers.getContractFactory("Client");

  const ClientAsAsh = ClientFactory.attach("0x18ec0bf18d727af80ddd51944255f2f12ecb9744").connect(
    signer
  );

  const { wait } = await ClientAsAsh.withdraw(
    "0x00564541B80C5A065308cA1C93759c5417476f36",
    "0xBEF1cC5318a8504Ce7CD382E8010E38FA1861738",
    "15000000000000000000"
  );

  console.log(await wait());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
