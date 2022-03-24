"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const ethereum_waffle_1 = require("ethereum-waffle");
const bn_js_1 = __importDefault(require("bn.js"));
const chai_1 = __importDefault(require("chai"));
const chai_bn_1 = __importDefault(require("chai-bn"));
const helpers_1 = require("./helpers");
const units_1 = require("@ethersproject/units");
const abi_1 = require("@ethersproject/abi");
chai_1.default.use(ethereum_waffle_1.solidity);
chai_1.default.use((0, chai_bn_1.default)(bn_js_1.default));
const { expect } = chai_1.default;
describe("Admin contract", () => {
    let deployer;
    let deployerAddress;
    let operator;
    let operatorAddress;
    let Admin;
    let ProtocolManager;
    let FeeCollector;
    let MockWorker;
    let MockVault;
    let FeeToken;
    async function fixture() {
        [deployer, operator] = await hardhat_1.ethers.getSigners();
        deployerAddress = await deployer.getAddress();
        [deployerAddress, operatorAddress] = await Promise.all([
            deployer.getAddress(),
            operator.getAddress(),
        ]);
        MockWorker = (await (0, helpers_1.deployContract)("MockWorker", [], deployer));
        FeeToken = await (0, helpers_1.deployToken)({
            name: "feeToken",
            symbol: "FTOK",
            holders: [
                {
                    address: deployerAddress,
                    amount: (0, units_1.parseEther)("100"),
                },
            ],
        }, deployer);
        MockVault = (await (0, helpers_1.deployContract)("MockVault", [FeeToken.address], deployer));
        ProtocolManager = (await (0, helpers_1.deployProxyContract)("ProtocolManager", [[deployerAddress, operatorAddress]], deployer));
        FeeCollector = (await (0, helpers_1.deployProxyContract)("FeeCollector", [FeeToken.address, (0, units_1.parseEther)("0.1").toString(), ProtocolManager.address], deployer));
        await ProtocolManager.approveWorkers([MockWorker.address], true, { from: deployerAddress });
        await ProtocolManager.approveVaults([MockVault.address], true);
        Admin = (await (0, helpers_1.deployProxyContract)("Admin", [ProtocolManager.address, FeeCollector.address], deployer));
        await ProtocolManager.approveAdminContract(Admin.address);
    }
    beforeEach(async () => {
        await hardhat_1.waffle.loadFixture(fixture);
    });
    it("Should disable and enable given farm", async () => {
        const Admin__operator = Admin.connect(operator);
        await Admin__operator.disableFarms([MockWorker.address]);
        expect(await Admin.isFarmEnabled(MockWorker.address)).to.be.false;
        await Admin__operator.enableFarms([MockWorker.address]);
        expect(await Admin.isFarmEnabled(MockWorker.address)).to.be.true;
    });
    it("Should set new fee for given farm", async () => {
        const Admin__operator = Admin.connect(operator);
        await Admin__operator.setFarmsFee([MockWorker.address], "1500");
        expect((await Admin__operator.getFarmFee(MockWorker.address)).toString()).to.be.eq("1500");
    });
    it("Should collect fee from FeeCollector", async () => {
        /// Transfer funds and register fee by vault on the fee collector
        const FeeToken__deployer = FeeToken.connect(deployer);
        FeeToken__deployer.transfer(FeeCollector.address, (0, units_1.parseEther)("5"));
        await MockVault.executeTransaction(FeeCollector.address, "0", "registerFees(address[],uint256[])", abi_1.defaultAbiCoder.encode(["address[]", "uint256[]"], [[Admin.address], [(0, units_1.parseEther)("5").toString()]]));
        expect((await Admin.feeToCollect()).toString()).to.be.eq((0, units_1.parseEther)("5").toString());
        const Admin__operator = Admin.connect(operator);
        await Admin__operator.collectFee(operatorAddress);
        expect((await FeeToken.balanceOf(operatorAddress)).toString()).to.be.eq((0, units_1.parseEther)("5").toString());
    });
});
