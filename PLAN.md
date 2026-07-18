# Epoché — Full Project & MVP Plan

**Tagline:** Suspension before finality.  
**Chain:** Monad (testnet first; mainnet if stable)  
**Hackathon:** Spark · BuildAnything — onchain solution to a personal problem  
**One-liner:** First-time and high-risk sends are automatically held for a short cool-off so you can cancel; trusted recipients go instant.

---

## 1. Problem

Crypto transfers are final the moment you confirm. That creates a personal failure mode:

- Phishing / clipboard address swap  
- Fat-finger / wrong last characters  
- First payment to a new address while distracted  
- Unusually large send on autopilot  

Soft warnings (“are you sure?”) get clicked through. Soft limits in a config file can be ignored. **Epoché makes hesitation onchain:** funds sit suspended until the window ends or you cancel.

---

## 2. Solution

**Epoché** is a personal **first-contact transfer hold**, not a marketplace escrow and not an agent spend policy.

| Situation | Behavior |
|-----------|----------|
| New recipient / risk signals | **Safety Mode** auto-activates → funds held → cancel until unlock → then claim/final |
| Trusted recipient | **Instant** transfer (no undo) |
| After successful protected send | Prompt to **Trust** so next send is instant |

**Pitch:**  
*Banks give you a moment to catch a mistake. Crypto doesn’t. Epoché is suspension of judgment for money in flight.*

**Not the product:** pay-for-goods escrow, agent leashes, multi-sig recovery, full wallet replacement.

---

## 3. Judges’ objection (designed out)

> “Couldn’t a malicious sender cancel after receiving goods?”

| Response | Implementation |
|----------|----------------|
| Wrong product for commerce | README + UI: “Not payment for goods. Seller should wait until Final.” |
| Cool-off too short for shipping workflows | Hard **MAX_COOLOFF** (30 min); default **15–20 min** |
| Finality is explicit | States: `Pending` → `Unlocked` / `Canceled` → `Claimed`; no cancel after unlock |
| Normal payments stay easy | Trusted list → instant path |

Demo line: *“Goods need two-party escrow. Epoché is one-sided undo for first contact, capped at 30 minutes.”*

---

## 4. MVP scope (ship this, nothing else)

### In scope

**Onchain**

- Native **MON** only  
- Protected send (hold + cool-off)  
- Cancel (sender, before unlock)  
- Claim (after unlock, pays recipient)  
- Instant send when recipient is trusted  
- Trust / untrust recipient (owner-scoped)  
- Hard max cool-off in contract  
- Events for every state change  

**Automatic Safety Mode (app logic + onchain path)**

When user hits Send, app evaluates risk. If risk → always route through protected send (no “Enable protection?” checkbox).

**UI**

- Connect wallet  
- Send form (to, amount)  
- Safety Mode banner (auto copy, not a settings maze)  
- Pending “in-flight” list with countdown + Cancel  
- Claimable list (recipient view or same wallet testing with two accounts)  
- Trusted contacts list (add / remove / labels optional)  
- Activity history (from events or contract reads)  
- Clear FINAL vs PENDING states  

**Ship package**

- Foundry contracts + tests  
- Frontend hosted URL  
- Public GitHub + README (problem, solution, threat model, demo steps)  
- Deployed contract address on Monad  
- Demo video ≤ 3 min  

### Out of scope (protect elegance)

- ERC-20 / multi-token  
- Commerce escrow / mutual release / disputes  
- Agent sessions / spend policies (LEASH territory)  
- Approval scanner, phishing DB, simulation suite  
- Cross-chain, account abstraction redesign, social recovery  
- Envio/heavy indexer (nice later; MVP uses RPC + events)  
- Mobile apps, notifications, ENS-required flows  
- Custom cool-off beyond presets (optional single default is enough for MVP)

---

## 5. Automatic Safety Mode (product rule)

**Principle:** Protection is the default when risk is detected. User does not opt in; they only opt out later via **Trust**.

### Risk signals (frontend heuristics)

Activate Safety Mode if **any** is true:

| Signal | Rule (MVP defaults) |
|--------|---------------------|
| **First interaction** | `!trusted[user][to]` (source of truth: onchain trust mapping) |
| **Never sent before** | No prior **Claimed** (or Instant) success to `to` in local/indexed history — optional soft signal; onchain trust is primary |
| **Clipboard origin** | Address field was filled primarily via paste (track `paste` event) |
| **Amount anomaly** | Amount ≥ `k ×` median/usual send, or ≥ absolute threshold (e.g. ≥ 50 MON if history small). MVP: simple threshold + “larger than last N sends” if history exists |

**MVP minimum (must implement):**

1. Not trusted → **always** protected  
2. Paste-detected → force protected **even if** somehow trusted? → **No:** trusted stays instant. Paste only matters when *not* trusted (copy in banner: “Address was pasted”)  
3. Amount anomaly when not trusted → same protected path; banner mentions large amount  

**Trusted + Send → Instant.** No cool-off, no cancel.

### UX copy (canonical)

When protected:

```
Safety Mode Activated

This is your first payment to this address.
Funds will unlock in 15 minutes unless you cancel.
```

Variants (pick one line of reason, don’t stack paragraphs):

- “Address was pasted from clipboard.”  
- “Amount is larger than your usual sends.”  
- “You’ve never completed a payment to this address.”

When instant:

```
Instant send — trusted recipient (no undo)
```

After successful claim (or after you were sender and it finalized):

```
Add to trusted contacts?
Next payment will be instant.
```

---

## 6. Cool-off policy

| Parameter | MVP value |
|-----------|-----------|
| Default cool-off | **15 minutes** |
| Contract maximum | **30 minutes** |
| User choice in UI | Optional: 5 / 15 / 30 only (all ≤ max). If time-tight, **fixed 15 min** only |
| Demo / testnet | Constructor or `DemoEpoché` with **2-minute** cool-off **or** document anvil warping; prefer **configurable default ≤ MAX** set at deploy for demo |

Recommendation: contract stores `defaultCoolOff` (owner of protocol or immutable at deploy) + `MAX_COOLOFF = 30 minutes`. User cannot exceed max.

---

## 7. Smart contract design

### 7.1 Single contract: `Epoche`

Factory is optional; **one contract** is enough for elegance and Spark.

```text
Epoche
  MAX_COOLOFF                  // immutable, e.g. 30 minutes
  defaultCoolOff               // e.g. 15 minutes

  trusted[owner][recipient] -> bool
  // optional: labels offchain only

  nextId -> uint256
  transfers[id] -> Transfer {
    address from;
    address to;
    uint128 amount;            // native wei
    uint64  unlockAt;
    uint8   status;            // 0 Pending, 1 Canceled, 2 Claimed
  }

  // --- trust ---
  setTrusted(address to, bool isTrusted)

  // --- send ---
  // msg.value = amount
  // if trusted[msg.sender][to] => transfer native immediately, emit InstantSent
  // else => create Pending transfer, unlockAt = block.timestamp + coolOff
  send(address to, uint64 coolOff) payable
  // coolOff == 0 means use defaultCoolOff; require coolOff <= MAX_COOLOFF when non-zero

  cancel(uint256 id)           // only from; only Pending; only now < unlockAt; refund from
  claim(uint256 id)            // only Pending; only now >= unlockAt; pay to; status Claimed

  // views
  getTransfer(uint256 id)
  isTrusted(address owner, address to)
```

### 7.2 Status machine

```text
        send (not trusted)
  * -------------------> Pending
                         | cancel (t < unlock)
                         +--------------> Canceled (refund to from)
                         | claim (t >= unlock)
                         +--------------> Claimed (pay to)

  send (trusted) ---> Instant (no Transfer row required; event only)
```

### 7.3 Events

```text
InstantSent(from, to, amount)
TransferCreated(id, from, to, amount, unlockAt)
TransferCanceled(id)
TransferClaimed(id)
TrustedUpdated(owner, to, isTrusted)
```

### 7.4 Safety invariants (tests must cover)

1. Cancel after unlock → revert  
2. Double cancel / double claim → revert  
3. Non-sender cancel → revert  
4. Claim before unlock → revert  
5. Cool-off > MAX → revert  
6. Trusted send does not create cancelable hold  
7. Cancel refunds exact amount to sender  
8. Claim pays exact amount to recipient  
9. Contract balance equals sum of Pending amounts  
10. Reentrancy-safe (Checks-Effects-Interactions / `call` pattern carefully)

### 7.5 Explicit non-goals in contract

- No recipient-side cancel  
- No extension of cool-off after create  
- No partial claim  
- No ERC-20 in MVP  

---

## 8. Frontend architecture

### 8.1 Stack (recommended)

| Layer | Choice |
|-------|--------|
| Framework | Next.js (App Router) or Vite + React — pick one; **Vite + React** is faster to polish if no SSR need |
| Chain | Monad testnet via viem + wagmi |
| Wallet | RainbowKit or ConnectKit |
| Contracts | wagmi generated hooks / viem writeContract |
| Style | Tailwind + **custom identity** (not default shadcn purple DeFi) |
| Deploy FE | Vercel |

### 8.2 Screens (one primary surface preferred)

**A. Command surface (single page app feel)**

1. **Header** — logo Epoché, network badge, connect  
2. **Send panel** — address, amount, primary CTA  
3. **Safety strip** — appears after risk evaluation (pre-tx preview)  
4. **In flight** — pending transfers with countdown + Cancel  
5. **Ready to claim** — unlock matured (for recipient; in demo use 2nd wallet)  
6. **Trusted** — chips/list with remove  
7. **Activity** — recent Instant / Created / Canceled / Claimed  

Optional second route: `/t/:id` public status page (nice, not required for MVP).

### 8.3 Send flow (detailed)

```text
User enters to + amount
  → App runs risk heuristics
  → Preview card:
       Safety Mode Activated | Instant (trusted)
  → User confirms in wallet
  → send{ value } or instant path
  → UI optimistic update + refetch events
```

Preflight simulation: `eth_call` / estimate to surface reverts before wallet (nice).

### 8.4 Visual identity (anti-slop)

- Metaphor: **suspension** / pause / judgment held — not purple gradient “DeFi dashboard”  
- Typography: one distinctive display font + clean mono for addresses  
- Motion: subtle countdown, not confetti  
- Color: restrained (e.g. deep ink + single accent for “Pending”, green/grey for Final)  
- Big numbers: countdown and amount hierarchy  

Working mood: *editorial fintech meets philosophy* (Epoché as concept), not crypto-casino.

---

## 9. Repo structure

```text
epoche/
  packages/ or root monorepo:
  contracts/                 # Foundry
    src/Epoche.sol
    test/Epoche.t.sol
    script/Deploy.s.sol
    foundry.toml
  app/                       # Frontend
    src/...
    package.json
  README.md
  PLAN.md                    # this file (or docs/)
```

Simple **two-folder monorepo** is enough; no need for Turborepo unless you want it.

---

## 10. Network & deploy

| Item | Value |
|------|--------|
| Target | Monad testnet (confirm chainId + RPC from Monad docs at deploy time) |
| Faucet | https://faucet.monad.xyz |
| Verify | Monad explorer verification if available |
| Env | `VITE_RPC_URL`, `VITE_CHAIN_ID`, `VITE_EPOCHE_ADDRESS` |

Deploy script outputs address → paste into frontend env → commit address in README.

---

## 11. Testing plan

### Foundry

- Unit tests for all invariants in §7.4  
- Fuzz cool-off bounds  
- Balance accounting invariant  

### Manual E2E (demo wallets A/B)

1. A → B first send → Safety Mode → pending  
2. A cancels → A balance restored  
3. A → B again → pending → wait/unlock → B claims  
4. A trusts B → A → B instant  
5. A untrusts B → next send protected again  
6. Paste address → banner shows paste reason (if not trusted)  

---

## 12. Demo video script (≤ 3 minutes)

| Time | Action |
|------|--------|
| 0:00–0:20 | Problem: one wrong paste = funds gone. Epoché = suspension before finality |
| 0:20–0:50 | Paste unknown address, large-ish amount → **Safety Mode Activated** automatically |
| 0:50–1:20 | Confirm tx → appears In Flight → **Cancel** → funds back |
| 1:20–1:50 | Second protected send → unlock (or demo cool-off) → recipient **Claim** |
| 1:50–2:20 | **Trust** recipient → third send **Instant** |
| 2:20–2:45 | “Not goods escrow; 30m max; one-sided undo for first contact” |
| 2:45–3:00 | Contract address, GitHub, live URL |

---

## 13. README outline (submission-facing)

1. What is Epoché  
2. Personal problem  
3. How it works (Safety Mode + Trusted)  
4. What it is not (goods escrow)  
5. Live app + contract + chain  
6. Demo walkthrough (3 steps)  
7. Architecture (contract state machine)  
8. Local dev (forge test, app dev)  
9. License  

---

## 14. Spark submission checklist

- [ ] Name: **Epoché**  
- [ ] Description: one sentence  
- [ ] Problem / Solution fields  
- [ ] Project URL (hosted)  
- [ ] Public GitHub  
- [ ] Category: Monad Testnet or Mainnet  
- [ ] Contract address  
- [ ] Demo video ≤ 3 min  
- [ ] Social post URL (viral track optional)  
- [ ] New work during hackathon window (no pre-dated bulk dump)  
- [ ] Real txs (no fake success toasts)  

---

## 15. Implementation phases

### Phase 0 — Setup (do first)

- [ ] `forge init` contracts  
- [ ] Scaffold frontend (Vite/React or Next) + wagmi/viem + wallet  
- [ ] Monad chain config  
- [ ] GitHub repo, MIT license  

### Phase 1 — Contract

- [ ] Implement `Epoche.sol`  
- [ ] Full Foundry tests  
- [ ] Deploy script  
- [ ] Deploy testnet → record address  

### Phase 2 — App core

- [ ] Connect wallet  
- [ ] Read trust + pending transfers (mapping + events)  
- [ ] Send with auto Safety Mode preview  
- [ ] Cancel / Claim  
- [ ] setTrusted  

### Phase 3 — Polish

- [ ] Distinct visual identity  
- [ ] Countdown UX, empty states, error reasons  
- [ ] Paste / amount heuristic banners  
- [ ] Mobile viewport fit  
- [ ] README + demo recording  

### Phase 4 — Submit

- [ ] Double-click every path (judges always click twice)  
- [ ] Social post  
- [ ] BuildAnything form  

---

## 16. Success criteria

MVP is done when:

1. A judge can connect and trigger **automatic** Safety Mode on a new address without toggling settings  
2. Cancel before unlock restores funds  
3. After unlock, claim pays recipient; cancel fails  
4. Trusted send is instant  
5. UI makes Pending vs Final obvious  
6. README answers the goods/cancel objection in one paragraph  
7. Hosted app + verified-in-README contract address work cold  

---

## 17. Open decisions (defaults locked unless you change them)

| Decision | Default |
|----------|---------|
| Name | **Epoché** |
| Token | Native MON only |
| Default cool-off | 15 minutes |
| Max cool-off | 30 minutes |
| Trust storage | Onchain `setTrusted` |
| Instant path | Onchain branch inside `send` |
| Indexer | None (RPC + events) |
| Frontend | Vite + React + wagmi + viem + Tailwind |
| Demo cool-off | Deploy with 15m; use second wallet + short wait **or** deploy demo param 120s for judging convenience |

**Optional flag:** `DEMO_COOLOFF=120` at deploy for easier live judging — document in README if used.

---

## 18. Immediate next steps (start building)

1. Scaffold `contracts/` + `app/` in this workspace  
2. Implement and test `Epoche.sol`  
3. Deploy Monad testnet  
4. Wire frontend to contract  
5. Polish Safety Mode UX + identity  
6. Demo + submit  

---

*Epoché: suspension of judgment — for the send you shouldn’t finalize yet.*
