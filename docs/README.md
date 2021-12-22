# DEV

## Deploy steps:

NOTE: After each steps you should update the config file in the `configs` folder with new addresses

1. Deploy ProtocolManager:

```bash
   npm run deploy:[network]:protocolManager
```

2. Deploy Admin contract:

```bash
   npm run deploy:[network]:Admin
```

3. Deploy FeeCollector:

```bash
   npm run deploy:[network]:feeCollector
```

4. Deploy WrappedNativeTokenRelayer

```bash
   npm run deploy:[network]:nativeRelayer
```

5. Deploy vaults:

   5.1. Check configuration variables in the `deploy/vault/deploy/vault.ts` file

   5.2. Run deploy:

   ```bash
   npm run deploy:[network]:vaults
   ```

6. Deploy pancake strategies:

```bash
npm run deploy:[network]:workers:pancake
```

7. Deploy workers:

   7.1. Check configuration variables in the `deploy/workers/deploy/pancake.ts` file

   7.2. Run deploy:

   ```bash
   npm run deploy:[network]:strategies:pancake
   ```

8. Deploy clients's contracts:

   8.1. Check configuration variables in the `deploy/client/deploy/client.ts` file

   8.2. Run deploy:

   ```bash
   npm run deploy:[network]:clients
   ```
