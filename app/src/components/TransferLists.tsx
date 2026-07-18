import { useEffect, useState } from 'react'
import { formatEther, type Address } from 'viem'
import { useAccount } from 'wagmi'
import {
  Status,
  useEpocheWrites,
  type TransferRow,
} from '../hooks/useEpoche'
import { formatCountdown, shortAddress } from '../lib/risk'
import { humanError, writeStatusLabel } from '../lib/errors'
import { addressExplorerUrl, contractExplorerUrl } from '../lib/explorer'
import {
  cacheTrustedAddress,
  getCachedTrustedList,
  getTrustedLabel,
  setTrustedLabel,
  uncacheTrustedAddress,
} from '../lib/trustedStore'

function useNow(tickMs = 1000) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), tickMs)
    return () => clearInterval(t)
  }, [tickMs])
  return now
}

function TransferCard({
  row,
  role,
  onCancel,
  onRelease,
  busy,
  busyLabel,
}: {
  row: TransferRow
  role: 'sender' | 'recipient' | 'other'
  onCancel?: () => void
  onRelease?: () => void
  busy?: boolean
  busyLabel?: string | null
}) {
  const now = useNow()
  const remaining = Math.max(0, row.unlockAt - now)
  const unlocked = now >= row.unlockAt
  const pending = row.status === Status.Pending

  const statusLabel =
    row.status === Status.Canceled
      ? 'Canceled'
      : row.status === Status.Claimed
        ? 'Released · Final'
        : unlocked
          ? 'Unlocked'
          : 'Safety Mode'

  return (
    <article className="rounded-xl border border-paper/10 bg-ink/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-lg text-paper">
            {formatEther(row.amount)} MON
          </p>
          <p className="mt-1 break-all text-xs text-muted">
            #{row.id.toString()} · {shortAddress(row.from)} →{' '}
            {shortAddress(row.to)}
          </p>
          {role === 'recipient' && pending && (
            <p className="mt-1 text-[11px] text-accent">Incoming hold · for you</p>
          )}
          {role === 'sender' && pending && !unlocked && (
            <p className="mt-1 text-[11px] text-muted">You can cancel until unlock</p>
          )}
          <div className="mt-1 flex flex-wrap gap-3 text-[11px]">
            <a
              href={contractExplorerUrl()}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              View contract
            </a>
            <a
              href={`/t/${row.id.toString()}`}
              className="text-accent underline-offset-2 hover:underline"
            >
              Share hold
            </a>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${
            row.status === Status.Claimed
              ? 'bg-final/20 text-final'
              : row.status === Status.Canceled
                ? 'bg-danger/20 text-danger'
                : unlocked
                  ? 'bg-final/15 text-final'
                  : 'bg-pending/20 text-pending'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {pending && !unlocked && (
        <p className="mt-3 font-display text-2xl tabular-nums text-pending">
          {formatCountdown(remaining)}
          <span className="ml-2 text-sm font-sans text-muted">until unlock</span>
        </p>
      )}

      {pending && unlocked && (
        <p className="mt-3 text-sm text-final">
          {role === 'recipient'
            ? 'The cancel window ended. Anyone can claim these funds to you.'
            : 'The cancel window ended. Funds can now be claimed only to the recipient.'}
        </p>
      )}

      {pending && role === 'sender' && !unlocked && (
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="mt-3 rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger hover:bg-danger/10 disabled:opacity-40"
        >
          {busy ? busyLabel || 'Confirm…' : 'Cancel & reclaim'}
        </button>
      )}

      {pending && unlocked && (
        <button
          type="button"
          disabled={busy}
          onClick={onRelease}
          className="mt-3 rounded-lg bg-final px-3 py-2 text-sm font-medium text-ink disabled:opacity-40"
        >
          {busy
            ? busyLabel || 'Confirm…'
            : role === 'recipient'
              ? 'Claim funds'
              : 'Claim to recipient'}
        </button>
      )}
    </article>
  )
}

export function TransferLists({
  onSettled,
  rows,
  loading,
  error,
  refresh,
}: {
  onSettled?: () => void
  rows: TransferRow[]
  loading: boolean
  error: string | null
  refresh: () => void | Promise<void>
}) {
  const { address } = useAccount()
  const writes = useEpocheWrites()
  const [actionId, setActionId] = useState<string | null>(null)
  const [handledHash, setHandledHash] = useState<string | undefined>()

  useEffect(() => {
    if (!writes.isSuccess || !writes.hash) return
    if (handledHash === writes.hash) return
    setHandledHash(writes.hash)
    setActionId(null)
    void refresh()
    onSettled?.()
    // Clear write state so a later action can start clean
    const t = setTimeout(() => writes.reset(), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to confirmation
  }, [writes.isSuccess, writes.hash, handledHash, refresh, onSettled, writes.reset])

  if (!address) {
    return (
      <div className="rounded-2xl border border-dashed border-paper/15 px-4 py-8 text-center text-sm text-muted">
        Connect a wallet to see Safety Mode holds and activity.
      </div>
    )
  }

  const me = address.toLowerCase()
  const pending = rows
    .filter((r) => r.status === Status.Pending)
    .sort((a, b) => a.unlockAt - b.unlockAt)
  const history = rows.filter((r) => r.status !== Status.Pending).slice(0, 12)

  const roleOf = (r: TransferRow) => {
    if (r.from.toLowerCase() === me) return 'sender' as const
    if (r.to.toLowerCase() === me) return 'recipient' as const
    return 'other' as const
  }

  const busy = writes.busy
  const busyLabel = writeStatusLabel({
    isPending: writes.isPending,
    isConfirming: writes.isConfirming,
  })

  const showInitialLoad = loading && rows.length === 0 && !error

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-xl text-paper sm:text-2xl">
            In flight
          </h2>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="text-xs uppercase tracking-wider text-muted hover:text-paper disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {error && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-danger">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-xs text-accent underline-offset-2 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        {showInitialLoad ? (
          <p className="rounded-xl border border-dashed border-paper/15 px-4 py-6 text-sm text-muted">
            Loading holds…
          </p>
        ) : pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-paper/15 px-4 py-6 text-sm text-muted">
            No protected sends waiting. Send to a new address to see Safety
            Mode.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <TransferCard
                key={r.id.toString()}
                row={r}
                role={roleOf(r)}
                busy={busy && actionId === r.id.toString()}
                busyLabel={busyLabel}
                onCancel={() => {
                  setActionId(r.id.toString())
                  setHandledHash(undefined)
                  writes.cancel(r.id)
                }}
                onRelease={() => {
                  setActionId(r.id.toString())
                  setHandledHash(undefined)
                  writes.claim(r.id)
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl text-paper sm:text-2xl">
          Activity
        </h2>
        {showInitialLoad ? (
          <p className="text-sm text-muted">Loading activity…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted">No settled transfers yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((r) => (
              <TransferCard
                key={`h-${r.id.toString()}`}
                row={r}
                role={roleOf(r)}
              />
            ))}
          </div>
        )}
      </section>

      {writes.error && (
        <p className="text-sm text-danger">{humanError(writes.error)}</p>
      )}
      {writes.isSuccess && writes.hash && (
        <p className="text-sm text-final">Action confirmed. List updated.</p>
      )}
    </div>
  )
}

export function TrustedPanel({ onChange }: { onChange?: () => void }) {
  const [addr, setAddr] = useState('')
  const [label, setLabel] = useState('')
  const [chips, setChips] = useState<string[]>([])
  const [pending, setPending] = useState<{
    to: Address
    trust: boolean
    label?: string
  } | null>(null)
  const [handledHash, setHandledHash] = useState<string | undefined>()
  const writes = useEpocheWrites()
  const valid = /^0x[a-fA-F0-9]{40}$/.test(addr)

  const reload = () => setChips(getCachedTrustedList())

  useEffect(() => {
    reload()
  }, [])

  // Only mutate local trusted cache after on-chain confirmation
  useEffect(() => {
    if (!writes.isSuccess || !writes.hash || !pending) return
    if (handledHash === writes.hash) return
    setHandledHash(writes.hash)
    if (pending.trust) {
      cacheTrustedAddress(pending.to)
      if (pending.label?.trim()) setTrustedLabel(pending.to, pending.label)
    } else {
      uncacheTrustedAddress(pending.to)
    }
    setPending(null)
    setAddr('')
    setLabel('')
    reload()
    onChange?.()
    const t = setTimeout(() => writes.reset(), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to confirmation
  }, [writes.isSuccess, writes.hash, pending, handledHash, onChange, writes.reset])

  const busy = writes.busy
  const statusLabel = writeStatusLabel({
    isPending: writes.isPending,
    isConfirming: writes.isConfirming,
  })

  return (
    <section className="rounded-2xl border border-paper/10 bg-ink-soft px-4 py-5 sm:p-6">
      <h2 className="font-display text-xl text-paper sm:text-2xl">
        People I trust
      </h2>
      <p className="mt-1 text-sm text-muted">
        Trusted recipients skip Safety Mode — instant, no cancel. Confirmed
        on-chain.
      </p>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((a) => {
            const name = getTrustedLabel(a)
            return (
              <span
                key={a}
                className="inline-flex items-center gap-2 rounded-full border border-paper/15 bg-ink px-3 py-1.5 text-xs"
              >
                <a
                  href={addressExplorerUrl(a)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-paper hover:text-accent"
                  title={a}
                >
                  {name || shortAddress(a as Address, 4)}
                </a>
                <button
                  type="button"
                  className="text-muted hover:text-danger disabled:opacity-40"
                  title="Untrust"
                  disabled={busy}
                  onClick={() => {
                    setPending({ to: a as Address, trust: false })
                    setHandledHash(undefined)
                    writes.setTrusted(a as Address, false)
                  }}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={addr}
          onChange={(e) => setAddr(e.target.value.trim())}
          placeholder="0x… to trust"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-paper/10 bg-ink px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-accent/40"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name (e.g. Mum)"
          className="w-full rounded-xl border border-paper/10 bg-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/40 sm:w-36"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!valid || busy}
          onClick={() => {
            const to = addr as Address
            setPending({ to, trust: true, label })
            setHandledHash(undefined)
            writes.setTrusted(to, true)
          }}
          className="rounded-xl bg-paper/10 px-4 py-3 text-sm font-medium hover:bg-paper/15 disabled:opacity-40"
        >
          {busy && pending?.trust ? statusLabel || 'Confirm…' : 'Trust'}
        </button>
        <button
          type="button"
          disabled={!valid || busy}
          onClick={() => {
            const to = addr as Address
            setPending({ to, trust: false })
            setHandledHash(undefined)
            writes.setTrusted(to, false)
          }}
          className="rounded-xl border border-paper/15 px-4 py-3 text-sm text-muted hover:text-paper disabled:opacity-40"
        >
          {busy && pending && !pending.trust
            ? statusLabel || 'Confirm…'
            : 'Untrust'}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">
        Trust is on-chain. Names are only saved in this browser.
      </p>
      {writes.error && (
        <p className="mt-2 text-sm text-danger">{humanError(writes.error)}</p>
      )}
      {writes.isSuccess && pending === null && (
        <p className="mt-2 text-sm text-final">Trust list updated on-chain.</p>
      )}
    </section>
  )
}
