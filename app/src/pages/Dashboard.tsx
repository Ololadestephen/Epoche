import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { ConnectButton } from '../components/ConnectButton'
import { NetworkBanner } from '../components/NetworkBanner'
import { SendPanel } from '../components/SendPanel'
import { TransferLists, TrustedPanel } from '../components/TransferLists'
import { EPOCHE_ADDRESS, isContractConfigured } from '../lib/config'
import { contractExplorerUrl } from '../lib/explorer'
import { Status, useEpocheConfig, useMyTransfers } from '../hooks/useEpoche'
import { useUnlockNotify } from '../hooks/useUnlockNotify'
import { formatCountdown } from '../lib/risk'

function useNow(tickMs = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), tickMs)
    return () => clearInterval(t)
  }, [tickMs])
  return now
}

export default function Dashboard() {
  const { isConnected } = useAccount()
  const { defaultCoolOff, maxCoolOff } = useEpocheConfig()
  const { rows, loading, error, refresh } = useMyTransfers()
  const now = useNow()

  useUnlockNotify(rows, isConnected)

  const pending = useMemo(
    () =>
      rows
        .filter((r) => r.status === Status.Pending)
        .sort((a, b) => a.unlockAt - b.unlockAt),
    [rows],
  )

  const primaryPending = pending[0]
  const remaining = primaryPending
    ? Math.max(0, primaryPending.unlockAt - now)
    : 0
  const unlocked = primaryPending ? now >= primaryPending.unlockAt : false
  const unlockedCount = pending.filter((r) => r.unlockAt <= now).length

  const bump = () => {
    void refresh()
  }

  const longCoolOff = (defaultCoolOff ?? 0) >= 10 * 60

  return (
    <div className="min-h-screen bg-ink text-paper">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-paper/10 pb-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/"
                className="text-xs font-medium uppercase tracking-[0.28em] text-accent hover:text-accent-soft"
              >
                Epoché
              </Link>
              <Link
                to="/faq"
                className="text-xs text-muted transition hover:text-paper"
              >
                FAQ
              </Link>
            </div>
            <h1 className="mt-1 font-display text-3xl tracking-tight text-paper sm:text-4xl">
              Command center
            </h1>
            <p className="mt-1 max-w-md text-sm text-muted">
              Safety Mode holds first sends. Cancel before unlock — or release
              when the window ends.
            </p>
          </div>
          <ConnectButton />
        </header>

        <NetworkBanner />

        <div className="mb-6 rounded-2xl border border-paper/10 bg-ink-soft px-4 py-4 sm:px-6">
          {!isConnected ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">
                  Status
                </p>
                <p className="mt-1 font-display text-2xl text-paper">
                  Connect a wallet to begin
                </p>
              </div>
            </div>
          ) : primaryPending ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">
                    {unlocked
                      ? 'Ready to release'
                      : pending.length > 1
                        ? `${pending.length} holds · Safety Mode`
                        : 'Safety Mode on'}
                  </p>
                  <p
                    className={`mt-1 font-display text-3xl tabular-nums sm:text-4xl ${
                      unlocked ? 'text-final' : 'text-pending'
                    }`}
                  >
                    {unlocked ? 'Unlocked' : formatCountdown(remaining)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {unlocked
                      ? 'Tap Release on the hold below when you’re ready (no auto-send).'
                      : 'Cancel anytime before unlock to reclaim funds.'}
                  </p>
                </div>
                <p className="font-mono text-xs text-muted">
                  Next #{primaryPending.id.toString()}
                </p>
              </div>
              {pending.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {pending.map((r) => {
                    const rem = Math.max(0, r.unlockAt - now)
                    const done = rem === 0
                    return (
                      <span
                        key={r.id.toString()}
                        className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${
                          done
                            ? 'border-final/40 text-final'
                            : 'border-paper/15 text-muted'
                        }`}
                      >
                        #{r.id.toString()} ·{' '}
                        {done ? 'release' : formatCountdown(rem)}
                      </span>
                    )
                  })}
                  {unlockedCount > 0 && (
                    <span className="text-[11px] text-final">
                      {unlockedCount} ready to release
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Status
              </p>
              <p className="mt-1 font-display text-2xl text-paper sm:text-3xl">
                {loading && rows.length === 0
                  ? 'Loading holds…'
                  : 'No holds in flight'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {loading && rows.length === 0
                  ? 'Fetching Safety Mode activity from Monad.'
                  : (
                      <>
                        Send to a{' '}
                        <strong className="text-paper">new address</strong> to
                        trigger Safety Mode.
                      </>
                    )}
              </p>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-paper/10 bg-ink px-4 py-3 text-xs text-muted sm:text-sm">
          <span className="font-medium text-accent">Flow: </span>
          new address → Safety Mode → cancel or wait → release → trust → next
          send instant
        </div>

        {longCoolOff && (
          <div className="mb-6 rounded-xl border border-paper/10 bg-ink-soft px-4 py-3 text-xs text-muted sm:text-sm">
            <span className="font-medium text-paper">Tip: </span>
            Default cool-off is{' '}
            {defaultCoolOff != null
              ? `${Math.round(defaultCoolOff / 60)} minutes`
              : 'long'}
            . For faster demos, redeploy with{' '}
            <code className="font-mono text-accent">DEMO=true</code> (2 min
            hold).
          </div>
        )}

        {!isContractConfigured && (
          <div className="mb-6 rounded-xl border border-pending/30 bg-pending/10 px-4 py-3 text-sm text-pending">
            Contract not configured. Set{' '}
            <code className="font-mono">VITE_EPOCHE_ADDRESS</code> in{' '}
            <code className="font-mono">app/.env</code>.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0 space-y-6">
            <SendPanel onSuccess={bump} />
            <TrustedPanel onChange={bump} />
          </div>
          <div className="min-w-0">
            <TransferLists
              onSettled={bump}
              rows={rows}
              loading={loading}
              error={error}
              refresh={refresh}
            />
          </div>
        </div>

        <footer className="mt-12 space-y-2 border-t border-paper/10 pt-6 text-xs text-muted">
          <p>
            <strong className="text-paper/80">Epoché</strong> is not marketplace
            escrow. One-sided cancel before unlock only. Sellers should wait
            until Final before shipping goods.{' '}
            <Link to="/faq" className="text-accent hover:underline">
              FAQ
            </Link>
          </p>
          {isContractConfigured && (
            <p className="break-all font-mono">
              Details · cool-off{' '}
              {defaultCoolOff != null
                ? `${Math.round(defaultCoolOff / 60)}m`
                : '—'}{' '}
              default · max{' '}
              {maxCoolOff != null ? `${Math.round(maxCoolOff / 60)}m` : '—'} ·{' '}
              <a
                href={contractExplorerUrl()}
                target="_blank"
                rel="noreferrer"
                className="text-accent underline-offset-2 hover:underline"
              >
                {EPOCHE_ADDRESS.slice(0, 8)}…{EPOCHE_ADDRESS.slice(-4)}
              </a>
            </p>
          )}
        </footer>
      </div>
    </div>
  )
}
