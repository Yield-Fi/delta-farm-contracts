"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployPancakeV2 = void 0;
const deployContract_1 = require("./deployContract");
const hardhat_1 = require("hardhat");
const deployPancakeV2 = async (wbnb, cakePerBlock, cakeHolders, deployer) => {
    const _feeToAddress = hardhat_1.ethers.constants.AddressZero;
    const PancakeFactory = (await (0, deployContract_1.deployContract)("PancakeFactory", [_feeToAddress], deployer));
    const PancakeRouterV2 = (await (0, deployContract_1.deployContract)("PancakeRouterV2", [PancakeFactory.address, wbnb.address], deployer));
    const CakeToken = (await (0, deployContract_1.deployContract)("CakeToken", [], deployer));
    // Deploy CAKE
    if (cakeHolders !== undefined) {
        cakeHolders.forEach(async (cakeHolder) => await CakeToken["mint(address,uint256)"](cakeHolder.address, cakeHolder.amount));
    }
    const SyrupBar = (await (0, deployContract_1.deployContract)("SyrupBar", [CakeToken.address], deployer));
    /// Setup MasterChef
    const PancakeMasterChef = (await (0, deployContract_1.deployContract)("PancakeMasterChef", [CakeToken.address, SyrupBar.address, await deployer.getAddress(), cakePerBlock, 0], deployer));
    // Transfer ownership so masterChef can mint CAKE
    await Promise.all([
        await CakeToken.transferOwnership(PancakeMasterChef.address),
        await SyrupBar.transferOwnership(PancakeMasterChef.address),
    ]);
    return [PancakeFactory, PancakeRouterV2, CakeToken, SyrupBar, PancakeMasterChef];
};
exports.deployPancakeV2 = deployPancakeV2;
