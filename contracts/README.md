# Epoché contracts

Foundry project for `Epoche.sol`.

## Environment (private key)

```bash
cp .env.example .env
# Edit .env — set PRIVATE_KEY=0x... (test wallet only)
```

Foundry loads `contracts/.env` automatically. That file is gitignored — **never commit it**.

```bash
forge test
forge build

# Deploy to Monad testnet (reads PRIVATE_KEY + MONAD_RPC from .env)
source .env   # optional; forge also auto-loads .env for vm.env*
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url "${MONAD_RPC:-https://testnet-rpc.monad.xyz}" \
  --broadcast

# Short cool-off for demos (2 minutes)
DEMO=true forge script script/Deploy.s.sol:DeployScript \
  --rpc-url "${MONAD_RPC:-https://testnet-rpc.monad.xyz}" \
  --broadcast
```

Fund the deployer on Monad testnet: https://faucet.monad.xyz
