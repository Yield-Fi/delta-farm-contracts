## Deploy steps:

NOTE: After each steps you should update the config file in the `configs` folder with new addresses

1. Deploy ProtocolManager: `npm run deploy:[network]:protocolManager`
2. Deploy BountyCollector: `npm run deploy:[network]:bountyCollector`
3. Deploy WrappedNativeTokenRelayer `npm run deploy:[network]:nativeRelayer`
4. Deploy vaults:
   a. Check configuration variables in the `deploy/vault/deploy/vault.ts` file
   b. `npm run deploy:[network]:vaults`
5. Deploy workers:
   a. Check configuration variables in the `deploy/workers/deploy/pancake.ts` file
   b. `npm run deploy:[network]:strategies:pancake`
6. Deploy pancake strategies: `npm run deploy:[network]:workers:pancake`
