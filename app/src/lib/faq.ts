export type FaqItem = { q: string; a: string }

/** Shared FAQ content for `/faq`. */
export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'What is Epoché?',
    a: 'Epoché is a personal onchain hold for first-time or high-risk native MON sends on Monad. When Safety Mode is on, funds sit in the contract for a short cool-off so you can cancel a mistake. Trusted recipients get instant sends with no undo. The name comes from the Greek ἐποχή — suspension of judgment.',
  },
  {
    q: 'Is this marketplace escrow for goods?',
    a: 'No. Epoché is one-sided undo for sender-side mistakes (phishing paste, fat-finger, first contact). Cool-off is hard-capped (max 30 minutes). Sellers should wait until status is Final before shipping anything. For commerce, use a real two-party escrow product—not Epoché.',
  },
  {
    q: 'How does Safety Mode decide to protect a send?',
    a: 'If the recipient is not on your trusted list, the send is protected onchain. The app also surfaces helpful signals in the banner (first payment, paste from clipboard, unusually large amount). Untrusted sends always go through the hold path; trusted sends go instant.',
  },
  {
    q: 'What is “trusted”?',
    a: 'Addresses you mark as trusted skip Safety Mode. Funds transfer immediately with no cancel window. Use it for people and places you already know. You can untrust anytime from the Trusted panel in the command center.',
  },
  {
    q: 'Can I cancel after the cool-off ends?',
    a: 'No. Before unlock, only the sender can cancel and reclaim. After unlock, cancel is disabled and release (claim) pays the fixed recipient. That keeps the product from becoming long-lived commerce escrow.',
  },
  {
    q: 'Why do I need a wallet popup to release?',
    a: 'Onchain value cannot move without a transaction. When the hold ends, release pays gas and sends MON to the recipient. Epoché does not auto-release—that caused wallet spam and UI thrash. You tap Release when ready.',
  },
  {
    q: 'Can I choose the wait time?',
    a: 'Yes. Safety Mode defaults to the contract default (often 15 minutes). In the app you can pick 5, 15, or 30 minutes before sending. The contract rejects cool-offs above the onchain maximum.',
  },
  {
    q: 'Which chain does Epoché run on?',
    a: 'Monad (testnet or mainnet depending on deploy). The MVP supports native MON only—no ERC-20, no multi-chain bridge.',
  },
  {
    q: 'What happens if the recipient never claims?',
    a: 'After unlock, release can be called by you or anyone else with gas. Funds stay in the contract until claim succeeds. Share the hold receipt (/t/:id) so the other party can see status.',
  },
  {
    q: 'Is my money safe while it’s held?',
    a: 'Funds are locked in the smart contract under fixed rules: only you can cancel before unlock; after unlock only release to the set recipient is allowed. Always verify the contract address and try a small amount on testnet first.',
  },
  {
    q: 'Does Epoché protect against malicious contracts or approvals?',
    a: 'No. It only governs native MON sends through the Epoché vault path. It does not revoke token approvals, simulate arbitrary contract calls, or replace a full wallet security suite.',
  },
  {
    q: 'How do I demo this for judges?',
    a: 'Connect on Monad testnet → send a small amount to a new address → cancel once to show reclaim → send again → wait for unlock (or use a DEMO cool-off deploy) → tap Release → Trust when prompted → send again and show Instant. Contract link is in the command center footer.',
  },
]
