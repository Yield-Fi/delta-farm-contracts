import { mainnetConfig } from "./mainnet";

export type ProjectConfigType = typeof mainnetConfig;

const vault = mainnetConfig.vaults[0];

export type VaultConfigType = typeof vault;

const worker = vault.workers[0];

export type WorkerConfigType = typeof worker;

const client = mainnetConfig.clients[0];

export type ClientConfigType = typeof client;
