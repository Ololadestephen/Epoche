# Epoché web app

The Epoché app is a Vite + React client for the Monad Testnet contract. It makes the first-contact safety flow visible: new recipients are held briefly, a sender can cancel before unlock, and trusted recipients receive future sends instantly.

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

`VITE_EPOCHE_ADDRESS` in `.env.example` points to the live Monad Testnet deployment. Connect an injected wallet on chain `10143` and use faucet MON for a small test transfer.

## Checks

```bash
npm run build
npm run lint
npm run test:hero-sphere
```

For the contract and deployment details, see the repository [README](../README.md).
