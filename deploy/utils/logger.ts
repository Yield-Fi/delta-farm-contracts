import fs from "fs";
import moment from "moment";
import { network } from "hardhat";

const date = moment().format("YYYY-MM");

const logDirectory = `${__dirname}/../../deploy-logs/${network.name}`;

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const logFile = `${logDirectory}/${date}.log`;

const logFileStream = fs.createWriteStream(logFile, {
  flags: "a",
});

export const logger = (message: string) => {
  console.log(message);
  const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
  logFileStream.write(currentTime + " ||| " + message + "\n");
};
