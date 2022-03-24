"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigEntity = exports.getConfig = void 0;
const hardhat_1 = require("hardhat");
const configs_1 = require("../../configs");
const getConfig = () => {
    switch (hardhat_1.network.name) {
        case "testnet":
            return configs_1.testnetConfig;
        case "mainnet":
            return configs_1.mainnetConfig;
        case "testnet-dev":
            return configs_1.testnetDevConfig;
        default:
            throw Error("Config file not found");
    }
};
exports.getConfig = getConfig;
const ConfigEntity = {
    getConfig: exports.getConfig,
};
exports.ConfigEntity = ConfigEntity;
__exportStar(require("../../configs"), exports);
