## DEV

### Owner

Address: 0x07661882d1C4b7F703Ca0A8898afE4D402dFdeF2

PK: f4ef769994d0ef275fbf47337fc9740022c4506de768735353183671fdfa79e8

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

5. Deploy pancake strategies:

```bash
npm run deploy:[network]:workers:pancake
```

6. Deploy workers:

   5.1. Check configuration variables in the `deploy/workers/deploy/pancake.ts` file

   5.2. Run deploy:

   ```bash
   npm run deploy:[network]:strategies:pancake
   ```

7. Deploy clients's contracts:

   7.1. Check configuration variables in the `deploy/client/deploy/client.ts` file

   7.2. Run deploy:

   ```bash
   npm run deploy:[network]:clients
   ```
