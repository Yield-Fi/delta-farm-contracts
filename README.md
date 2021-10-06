## Deploy steps:

NOTE: After each steps you should update the config file in the `configs` folder with new addresses

1. Deploy ProtocolManager:

```bash
   npm run deploy:[network]:protocolManager
```

2. Deploy BountyCollector:

```bash
   npm run deploy:[network]:bountyCollector
```

3. Deploy WrappedNativeTokenRelayer

```bash
   npm run deploy:[network]:nativeRelayer
```

4. Deploy vaults:

   4.1. Check configuration variables in the `deploy/vault/deploy/vault.ts` file

   4.2. Run deploy:

   ```bash
   npm run deploy:[network]:vaults
   ```

5. Deploy workers:

   5.1. Check configuration variables in the `deploy/workers/deploy/pancake.ts` file

   5.2. Run deploy:

   ```bash
   npm run deploy:[network]:strategies:pancake
   ```

6. Deploy pancake strategies:

```bash
npm run deploy:[network]:workers:pancake
```
