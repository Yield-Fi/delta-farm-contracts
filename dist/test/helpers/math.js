"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqrt = void 0;
const ethers_1 = require("ethers");
const sqrt = (value) => {
    const ONE = ethers_1.BigNumber.from(1);
    const TWO = ethers_1.BigNumber.from(2);
    let z = value.add(ONE).div(TWO);
    let y = value;
    while (z.sub(y).isNegative()) {
        y = z;
        z = value.div(z).add(z).div(TWO);
    }
    return y;
};
exports.sqrt = sqrt;
