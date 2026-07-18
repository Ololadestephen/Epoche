import { useEffect, useMemo, useState } from 'react'
import { isAddress, type Address } from 'viem'
import { useAccount } from 'wagmi'
import { assessRisk } from '../lib/risk'
import {
  allowedPresets,
  defaultPresetSeconds,
  formatCoolOffMinutes,
} from '../lib/coolOff'
import { useEpocheConfig, useEpocheWrites, useIsTrusted } from '../hooks/useEpoche'
import { isContractConfigured } from '../lib/config'
import { humanError, writeStatusLabel } from '../lib/errors'
import { cacheTrustedAddress } from '../lib/trustedStore'
import { txExplorerUrl } from '../lib/explorer'
import { shortAddress } from '../lib/risk'
import {
  getRecentRecipients,
  pushRecentRecipient,
} from '../lib/recentRecipients'

export function SendPanel({ onSuccess }: { onSuccess?: () => void }) {
  const { isConnected, address } = useAccount()
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [wasPasted, setWasPasted] = useState(false)
  const [trustPrompt, setTrustPrompt] = useState<Address | null>(null)
  const [pendingTrust, setPendingTrust] = useState<Address | null>(null)
  const [handledHash, setHandledHash] = useState<string | undefined>()
  const [lastAction, setLastAction] = useState<'send' | 'trust' | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [lastSendProtected, setLastSendProtected] = useState<boolean | null>(null)
  const [coolOffSeconds, setCoolOffSeconds] = useState(15 * 60)
  const [coolOffSynced, setCoolOffSynced] = useState(false)
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    setRecent(getRecentRecipients())
  }, [])

  const toAddr = isAddress(to) ? (to as Address) : undefined
  const selfSend =
    Boolean(toAddr && address) &&
    toAddr!.toLowerCase() === address!.toLowerCase()
  const { data: trusted, refetch: refetchTrusted } = useIsTrusted(
    selfSend ? undefined : toAddr,
  )
  const { defaultCoolOff, maxCoolOff } = useEpocheConfig()
  const writes = useEpocheWrites()

  const presets = useMemo(() => allowedPresets(maxCoolOff), [maxCoolOff])

  useEffect(() => {
    if (coolOffSynced) return
    if (defaultCoolOff == null && maxCoolOff == null) return
    const next = defaultPresetSeconds(defaultCoolOff)
    const allowed = allowedPresets(maxCoolOff)
    const ok = allowed.some((p) => p.seconds === next)
    setCoolOffSeconds(ok ? next : (allowed[0]?.seconds ?? 15 * 60))
    setCoolOffSynced(true)
  }, [defaultCoolOff, maxCoolOff, coolOffSynced])

  const amountWei = useMemo(() => {
    try {
      if (!amount || Number(amount) <= 0) return 0n
      // Reject absurd precision / scientific notation
      if (!/^\d+(\.\d+)?$/.test(amount.trim())) return 0n
      const [w, f = ''] = amount.trim().split('.')
      if (f.length > 18) return 0n
      const frac = (f + '000000000000000000').slice(0, 18)
      return BigInt(w || '0') * 10n ** 18n + BigInt(frac)
    } catch {
      return 0n
    }
  }, [amount])

  const risk = assessRisk({
    to: toAddr,
    amountWei,
    isTrusted: Boolean(trusted),
    wasPasted,
  })

  const coolOffLabel = formatCoolOffMinutes(coolOffSeconds)
  const busy = writes.busy
  const statusLabel = writeStatusLabel({
    isPending: writes.isPending,
    isConfirming: writes.isConfirming,
  })

  const canSend =
    isConnected &&
    isContractConfigured &&
    Boolean(toAddr) &&
    !selfSend &&
    amountWei > 0n &&
    !busy

  // Handle confirmed send
  useEffect(() => {
    if (!writes.isSuccess || !writes.hash) return
    if (handledHash === writes.hash) return
    if (lastAction !== 'send') return
    setHandledHash(writes.hash)
    setReviewing(false)
    onSuccess?.()
    if (toAddr) {
      pushRecentRecipient(toAddr)
      setRecent(getRecentRecipients())
    }
    if (toAddr && risk.protected) {
      setTrustPrompt(toAddr)
      // Clear amount so a double-submit is less likely; keep recipient for trust UX
      setAmount('')
    } else if (toAddr && !risk.protected) {
      cacheTrustedAddress(toAddr)
      setAmount('')
    }
  }, [
    writes.isSuccess,
    writes.hash,
    handledHash,
    onSuccess,
    toAddr,
    risk.protected,
    lastAction,
  ])

  // Handle confirmed trust (from prompt only — never cache before confirm)
  useEffect(() => {
    if (!writes.isSuccess || !writes.hash) return
    if (handledHash === writes.hash) return
    if (lastAction !== 'trust' || !pendingTrust) return
    setHandledHash(writes.hash)
    cacheTrustedAddress(pendingTrust)
    setPendingTrust(null)
    setTrustPrompt(null)
    void refetchTrusted()
    onSuccess?.()
  }, [
    writes.isSuccess,
    writes.hash,
    handledHash,
    lastAction,
    pendingTrust,
    refetchTrusted,
    onSuccess,
  ])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!toAddr || !canSend) return
    setReviewing(true)
  }

  const confirmSend = () => {
    if (!toAddr || !canSend) return
    const coolOff = risk.protected ? coolOffSeconds : 0
    setLastSendProtected(risk.protected)
    setLastAction('send')
    setHandledHash(undefined)
    writes.send(toAddr, amount.trim(), coolOff)
  }

  const resetFormNoise = () => {
    writes.reset()
    setTrustPrompt(null)
    setPendingTrust(null)
    setHandledHash(undefined)
    setLastAction(null)
    setReviewing(false)
    setLastSendProtected(null)
  }

  if (!isConnected) {
    return (
      <section className="rounded-2xl border border-paper/10 bg-ink-soft px-4 py-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Your safer first send
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-tight text-paper sm:text-3xl">
          Connect to start
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
          Connect your wallet above. New recipients get a short onchain hold;
          people you trust are paid instantly.
        </p>
        <div className="mt-5 grid gap-2 text-center text-xs sm:grid-cols-3">
          {[
            ['1', 'Send to someone new'],
            ['2', 'Cancel if it’s wrong'],
            ['3', 'Trust next time'],
          ].map(([number, label]) => (
            <div
              key={number}
              className="rounded-xl border border-paper/10 bg-ink px-2 py-3"
            >
              <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-ink">
                {number}
              </span>
              <p className="mt-2 leading-snug text-muted">{label}</p>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (reviewing && toAddr) {
    return (
      <section className="rounded-2xl border border-paper/10 bg-ink-soft px-4 py-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              Review before wallet
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-tight text-paper sm:text-3xl">
              {risk.protected ? 'Confirm protected send' : 'Confirm instant send'}
            </h2>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              risk.protected
                ? 'bg-pending/15 text-pending'
                : 'bg-final/15 text-final'
            }`}
          >
            {risk.protected ? 'Protected' : 'Instant'}
          </span>
        </div>

        <dl className="mt-6 divide-y divide-paper/10 rounded-xl border border-paper/10 bg-ink px-4">
          <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:items-center">
            <dt className="text-xs uppercase tracking-wider text-muted">Recipient</dt>
            <dd className="break-all font-mono text-sm text-paper">{toAddr}</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:items-center">
            <dt className="text-xs uppercase tracking-wider text-muted">Amount</dt>
            <dd className="font-mono text-lg text-paper">{amount.trim()} MON</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:items-center">
            <dt className="text-xs uppercase tracking-wider text-muted">Protection</dt>
            <dd className={risk.protected ? 'text-pending' : 'text-final'}>
              {risk.protected
                ? `Cancelable for ${coolOffLabel}`
                : 'Trusted recipient · no undo'}
            </dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr] sm:items-center">
            <dt className="text-xs uppercase tracking-wider text-muted">Afterward</dt>
            <dd className="text-sm leading-relaxed text-muted">
              {risk.protected
                ? 'When the timer ends, the MON can only be claimed to this address.'
                : 'The MON transfers immediately when your wallet confirms.'}
            </dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            type="button"
            disabled={busy}
            onClick={confirmSend}
            className="rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-ink transition enabled:hover:bg-accent-soft disabled:opacity-40"
          >
            {statusLabel ||
              (risk.protected ? 'Confirm protected send' : 'Confirm instant send')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              writes.reset()
              setReviewing(false)
            }}
            className="rounded-xl border border-paper/15 px-4 py-3.5 text-sm text-muted transition hover:border-paper/30 hover:text-paper disabled:opacity-40"
          >
            Edit details
          </button>
        </div>

        {writes.error && (
          <p className="mt-3 text-sm text-danger">{humanError(writes.error)}</p>
        )}
        <p className="mt-4 font-mono text-[11px] text-muted">
          From {address ? shortAddress(address, 5) : '—'}
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-paper/10 bg-ink-soft px-4 py-5 sm:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight text-paper sm:text-3xl">
          Send MON
        </h2>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">native</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-muted">
            Recipient
          </span>
          <input
            value={to}
            onChange={(e) => {
              setTo(e.target.value.trim())
              setWasPasted(false)
              resetFormNoise()
            }}
            onPaste={() => setWasPasted(true)}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-xl border border-paper/10 bg-ink px-4 py-3 font-mono text-sm text-paper outline-none ring-accent/40 placeholder:text-muted/60 focus:ring-2"
          />
          {selfSend && (
            <p className="text-xs text-danger">
              You can’t send to your own address.
            </p>
          )}
          {recent.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {recent.slice(0, 5).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setTo(a)
                    setWasPasted(false)
                    resetFormNoise()
                  }}
                  className="rounded-full border border-paper/15 bg-ink px-2.5 py-1 font-mono text-[11px] text-muted hover:border-accent/40 hover:text-paper"
                >
                  {shortAddress(a as Address, 4)}
                </button>
              ))}
            </div>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-muted">
            Amount (MON)
          </span>
          <input
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              resetFormNoise()
            }}
            placeholder="0.0"
            inputMode="decimal"
            autoComplete="off"
            className="w-full rounded-xl border border-paper/10 bg-ink px-4 py-3 font-mono text-sm text-paper outline-none ring-accent/40 placeholder:text-muted/60 focus:ring-2"
          />
        </label>

        {toAddr && amountWei > 0n && !selfSend && (
          <div
            className={`rounded-xl border px-4 py-3 ${
              risk.protected
                ? 'border-pending/40 bg-pending/10'
                : 'border-final/40 bg-final/10'
            }`}
          >
            <p
              className={`text-lg font-semibold ${
                risk.protected ? 'text-pending' : 'text-final'
              }`}
            >
              {risk.protected ? 'New recipient · protected' : 'Instant · trusted'}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-paper/85">
              {risk.detail}
              {risk.protected && (
                <>
                  {' '}You can cancel for <strong>{coolOffLabel}</strong>.
                </>
              )}
            </p>

            {risk.protected && (
              <div className="mt-3">
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted">
                  How long should this stay cancelable?
                </p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((p) => {
                    const selected = coolOffSeconds === p.seconds
                    return (
                      <button
                        key={p.seconds}
                        type="button"
                        onClick={() => setCoolOffSeconds(p.seconds)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          selected
                            ? 'bg-pending/30 text-pending ring-1 ring-pending/50'
                            : 'bg-ink/50 text-muted hover:text-paper'
                        }`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {risk.protected && (
              <p className="mt-2 text-xs text-muted">
                After the timer ends, MON can only be claimed to this recipient.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSend}
          className="w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold tracking-wide text-ink transition enabled:hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          {!isContractConfigured
              ? 'Contract not configured'
              : statusLabel
                ? statusLabel
                : risk.protected
                  ? 'Review protected send'
                  : 'Review instant send'}
        </button>

        {writes.error && (
          <p className="text-sm text-danger">{humanError(writes.error)}</p>
        )}
        {writes.isSuccess && writes.hash && lastAction === 'send' && (
          <div className="rounded-xl border border-final/30 bg-final/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-final">
              Transaction confirmed
            </p>
            <p className="mt-1 text-lg font-semibold text-paper">
              {lastSendProtected ? 'Your MON is protected' : 'MON sent instantly'}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {lastSendProtected
                ? 'The countdown and cancel action are now shown in Protected transfers.'
                : 'This trusted recipient received the transfer without a hold.'}
            </p>
            <a
              href={txExplorerUrl(writes.hash)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-final underline underline-offset-2"
            >
              View transaction
            </a>
          </div>
        )}
        {writes.isSuccess && writes.hash && lastAction === 'trust' && (
          <p className="text-sm text-final">
            Trusted. Next send to this address is instant.
          </p>
        )}
      </form>

      {trustPrompt && (
        <div className="mt-4 rounded-xl border border-paper/15 bg-ink p-4">
          <p className="text-lg font-semibold text-paper">
            Trust this recipient?
          </p>
          <p className="mt-1 text-sm text-muted">
            Next payment to {shortAddress(trustPrompt, 5)} will be instant (no
            undo). Only trust people you know.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-final px-3 py-2 text-sm font-medium text-ink disabled:opacity-40"
              onClick={() => {
                setLastAction('trust')
                setPendingTrust(trustPrompt)
                setHandledHash(undefined)
                writes.setTrusted(trustPrompt, true)
              }}
            >
              {busy && lastAction === 'trust'
                ? statusLabel || 'Confirm…'
                : 'Trust'}
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-paper/20 px-3 py-2 text-sm text-muted disabled:opacity-40"
              onClick={() => {
                setTrustPrompt(null)
                setPendingTrust(null)
              }}
            >
              Not now
            </button>
          </div>
          {writes.error && lastAction === 'trust' && (
            <p className="mt-2 text-sm text-danger">{humanError(writes.error)}</p>
          )}
        </div>
      )}

      {address && (
        <p className="mt-4 font-mono text-[11px] text-muted">
          From {shortAddress(address, 5)}
        </p>
      )}
    </section>
  )
}
