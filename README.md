# Epoché

**Suspension before finality.**

First-time and untrusted native MON sends on Monad are automatically held for a short cool-off so you can cancel. Trusted recipients go instant.

> Personal problem: crypto transfers are final the moment you confirm. Soft “are you sure?” dialogs get ignored. Epoché puts a real cancel window on first contact — not marketplace escrow.

**Network:** Monad Testnet (`10143`)  
**Contract:** [`0xca49Fd7c48194F06756fDD3c05CD8055CB652F65`](https://testnet.monadvision.com/address/0xca49Fd7c48194F06756fDD3c05CD8055CB652F65)

---

## Monorepo

```
contracts/   Foundry — Epoche.sol + tests
app/         Vite + React + wagmi — landing, FAQ, command center
PLAN.md      Product / MVP notes
```

## Quick start (app)

```bash
cd app
cp .env.example .env   # already points at the live testnet contract
npm install
npm run dev
```

Open the local URL → **Open app** / `/app` → connect a wallet on **Monad Testnet** → faucet: https://faucet.monad.xyz

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
# Edit contracts/.env → PRIVATE_KEY=0x... (burner / test wallet only)

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
| **Safety Mode** | Recipient not trusted | Hold → cancel until unlock → manual release/claim |
| **Instant** | Recipient trusted | Immediate transfer, no undo |

Safety Mode is **automatic** — no “enable protection?” checkbox. After a protected send, the app offers **Trust** so the next payment is instant.

### Contract API

- `send(to, coolOff) payable` — `coolOff = 0` uses default
- `cancel(id)` — sender only, before unlock
- `claim(id)` — after unlock, pays recipient (anyone may call)
- `setTrusted(to, bool)`

## Threat model

Epoché solves **sender-side mistakes** (phishing paste, fat-finger, first contact). It does **not** secure pay-for-goods: a malicious sender could cancel before unlock if a seller ships early. Cool-off is hard-capped at 30 minutes, finality is explicit in the UI, and recurring counterparties should be **trusted** (instant, no cancel).

## Demo path (≤3 minutes)

**Prep:** Monad Testnet wallet, test MON from the faucet, app at `/app`.

1. **Connect** wallet on Monad Testnet.  
2. **Send** a small amount to a **new** address → **Safety Mode on**.  
3. **Cancel & reclaim** before unlock → funds return.  
4. **Send again** → wait for unlock (or use a short cool-off preset).  
5. **Release to recipient** (manual — no auto-send) → **Released · Final**.  
6. **Trust** when prompted → next send is **Instant · trusted**.  

Contract link is also in the command-center footer (MonadVision).

## License

MIT
