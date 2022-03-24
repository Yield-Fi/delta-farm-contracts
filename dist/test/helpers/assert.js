"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAlmostEqual = void 0;
const ethers_1 = require("ethers");
const chai_1 = __importDefault(require("chai"));
const ethereum_waffle_1 = require("ethereum-waffle");
chai_1.default.use(ethereum_waffle_1.solidity);
const { expect } = chai_1.default;
const assertAlmostEqual = (expected, actual) => {
    const expectedBN = ethers_1.BigNumber.from(expected);
    const actualBN = ethers_1.BigNumber.from(actual);
    const diffBN = expectedBN.gt(actualBN) ? expectedBN.sub(actualBN) : actualBN.sub(expectedBN);
    const tolerance = expectedBN.div(ethers_1.BigNumber.from("10000"));
    return expect(diffBN, `${actual} is not almost eqaual to ${expected}`).to.be.lte(tolerance);
};
exports.assertAlmostEqual = assertAlmostEqual;
