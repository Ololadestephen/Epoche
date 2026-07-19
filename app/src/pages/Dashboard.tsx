import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { ConnectButton } from '../components/ConnectButton'
import { NetworkBanner } from '../components/NetworkBanner'
import { SendPanel } from '../components/SendPanel'
import { TransferLists, TrustedPanel } from '../components/TransferLists'
import { isContractConfigured } from '../lib/config'
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

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-50 border-b border-paper/10 bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
            <Link to="/" className="flex shrink-0 items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-paper/30">
                <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_#c5e063]" />
              </span>
              <span className="hidden text-xs font-semibold uppercase tracking-[0.22em] text-paper sm:inline">
                Epoché
              </span>
            </Link>

            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-paper/10 bg-paper/5 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-final" />
              <span className="sm:hidden">Testnet</span>
              <span className="hidden sm:inline">Monad Testnet</span>
            </span>

            <Link
              to="/faq"
              className="hidden min-h-11 items-center px-1 text-xs text-muted transition hover:text-paper sm:flex"
            >
              FAQ
            </Link>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-7 sm:px-6 sm:pt-9">
        <div className="mb-6">
          <h1 className="font-display text-3xl tracking-tight text-paper sm:text-4xl">
            Safe send
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            New recipients get a short hold. Trusted recipients are paid
            instantly.
          </p>
        </div>

        <NetworkBanner />

        {isConnected && (
          <div className="mb-6 rounded-2xl border border-paper/10 bg-ink-soft px-4 py-4 sm:px-6">
            {primaryPending ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted">
                      {unlocked
                        ? 'Cancel window ended'
                        : pending.length > 1
                          ? `${pending.length} protected`
                          : 'Protected'}
                    </p>
                    <p
                      className={`mt-1 font-display text-3xl tabular-nums sm:text-4xl ${
                        unlocked ? 'text-final' : 'text-pending'
                      }`}
                    >
                      {unlocked ? 'Claimable' : formatCountdown(remaining)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {unlocked
                        ? 'Funds can now be claimed to the recipient. You can no longer cancel.'
                        : 'You can cancel and get the money back until the timer ends.'}
                    </p>
                  </div>
                  <p className="font-mono text-xs text-muted">
                    #{primaryPending.id.toString()}
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
                          {done ? 'claimable' : formatCountdown(rem)}
                        </span>
                      )
                    })}
                    {unlockedCount > 0 && (
                      <span className="text-[11px] text-final">
                        {unlockedCount} claimable
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">
                  Your safety status
                </p>
                <p className="mt-1 font-display text-2xl text-paper sm:text-3xl">
                  {loading && rows.length === 0
                    ? 'Checking activity…'
                    : 'No active holds'}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {loading && rows.length === 0
                    ? 'Loading your protected sends from Monad.'
                    : 'Send to someone new and you will get time to catch a mistake.'}
                </p>
              </div>
            )}
          </div>
        )}

        {!isContractConfigured && (
          <div className="mb-6 rounded-xl border border-pending/30 bg-pending/10 px-4 py-3 text-sm text-pending">
            App is not set up yet. Add the contract address in{' '}
            <code className="font-mono">app/.env</code>.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-w-0 space-y-6">
            <SendPanel onSuccess={bump} />
            {isConnected && <TrustedPanel onChange={bump} />}
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
            Not for buying goods — only you can cancel, and only before the
            timer ends.{' '}
            <Link to="/faq" className="text-accent hover:underline">
              FAQ
            </Link>
          </p>
          {isContractConfigured && (
            <p className="break-all font-mono">
              Hold{' '}
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
                Contract
              </a>
            </p>
          )}
        </footer>
      </main>
    </div>
  )
}
