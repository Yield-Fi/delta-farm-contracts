"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const moment_1 = __importDefault(require("moment"));
const hardhat_1 = require("hardhat");
const date = (0, moment_1.default)().format("YYYY-MM");
const logDirectory = `${__dirname}/../../deploy-logs/${hardhat_1.network.name}`;
if (!fs_1.default.existsSync(logDirectory)) {
    fs_1.default.mkdirSync(logDirectory, { recursive: true });
}
const logFile = `${logDirectory}/${date}.log`;
const logFileStream = fs_1.default.createWriteStream(logFile, {
    flags: "a",
});
const logger = (message) => {
    console.log(message);
    const currentTime = (0, moment_1.default)().format("YYYY-MM-DD HH:mm:ss");
    logFileStream.write(currentTime + " ||| " + message + "\n");
};
exports.logger = logger;
