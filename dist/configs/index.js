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
exports.testnetDevConfig = exports.testnetConfig = exports.mainnetConfig = void 0;
var mainnet_1 = require("./mainnet");
Object.defineProperty(exports, "mainnetConfig", { enumerable: true, get: function () { return mainnet_1.mainnetConfig; } });
var testnet_1 = require("./testnet");
Object.defineProperty(exports, "testnetConfig", { enumerable: true, get: function () { return testnet_1.testnetConfig; } });
var testnet_dev_1 = require("./testnet.dev");
Object.defineProperty(exports, "testnetDevConfig", { enumerable: true, get: function () { return testnet_dev_1.testnetDevConfig; } });
__exportStar(require("./types"), exports);
