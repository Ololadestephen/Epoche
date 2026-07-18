# Epoché

**Trust should be earned, not assumed.**

Epoché is a first-contact trust layer for native MON sends on Monad. New and untrusted recipients are automatically held for a short cool-off so you can cancel a mistake. People you trust go instant.

> Personal problem: crypto transfers are final the moment you confirm. Soft “are you sure?” dialogs get ignored. Epoché puts a real cancel window on first contact, not marketplace escrow.

**Live app:** https://epoche-five.vercel.app/  
**Network:** Monad Testnet (`10143`)  
**Contract:** [`0xca49Fd7c48194F06756fDD3c05CD8055CB652F65`](https://testnet.monadvision.com/address/0xca49Fd7c48194F06756fDD3c05CD8055CB652F65)

---

## Monorepo

```
contracts/   Foundry — Epoche.sol + tests
app/         Vite + React + wagmi — landing, FAQ, command center
```

## Live

- **App:** https://epoche-five.vercel.app/  
- **Command center:** https://epoche-five.vercel.app/app  
- **FAQ:** https://epoche-five.vercel.app/faq  

Connect a wallet on **Monad Testnet** (`10143`). Faucet: https://faucet.monad.xyz

## Quick start (local)

```bash
cd app
cp .env.example .env   # already points at the live testnet contract
npm install
npm run dev
```

Open the local URL → **Open app** / `/app` → connect on Monad Testnet.

```bash
npm run build   # production build
```

## Contracts

```bash
cd contracts
forge test
```

### Deploy your own (optional)

```bash
cd contracts
cp .env.example .env
# Edit contracts/.env → PRIVATE_KEY=0x... 

# 15 min default / 30 min max cool-off
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast

# Faster demos: 2 min default
DEMO=true forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast
```

Copy the new address into `app/.env` as `VITE_EPOCHE_ADDRESS`.

## How it works

| Path | When | Behavior |
|------|------|----------|
| **Safety Mode** | Recipient not trusted | Hold → sender can cancel until unlock → anyone can claim only to the recipient |
| **Instant** | Recipient trusted | Immediate transfer, no undo |

Safety Mode is **automatic** — no “enable protection?” checkbox. After a protected send, the app offers **Trust** so the next payment is instant.

### Contract API

- `send(to, coolOff) payable` — `coolOff = 0` uses default
- `cancel(id)` — sender only, before unlock
- `claim(id)` — after unlock, pays recipient (anyone may call)
- `setTrusted(to, bool)`

## Threat model

Epoché solves **sender-side mistakes** (phishing paste, fat-finger, first contact). It does **not** secure pay-for-goods: a malicious sender could cancel before unlock if a seller ships early. Cool-off is hard-capped at 30 minutes, and recurring counterparties should be **trusted** (instant, no cancel). After unlock, a claim can be submitted by anyone, but the contract can only pay the fixed recipient.


Contract link is also in the command-center footer (MonadVision).

## License

MIT
