import type { Address } from 'viem'

export type RiskSignal =
  | 'first_payment'
  | 'pasted'
  | 'large_amount'
  | 'trusted'

export type RiskAssessment = {
  protected: boolean
  signals: RiskSignal[]
  headline: string
  detail: string
}

const LARGE_AMOUNT_MON = 50n * 10n ** 18n

/**
 * Automatic Safety Mode heuristics.
 * Trusted recipients always go instant — paste/amount do not override trust.
 */
export function assessRisk(opts: {
  to: Address | undefined
  amountWei: bigint
  isTrusted: boolean
  wasPasted: boolean
  recentSendAmountsWei?: bigint[]
}): RiskAssessment {
  const { to, amountWei, isTrusted, wasPasted, recentSendAmountsWei = [] } =
    opts

  if (!to) {
    return {
      protected: true,
      signals: [],
      headline: 'Enter a recipient',
      detail: 'We’ll evaluate Safety Mode once an address is set.',
    }
  }

  if (isTrusted) {
    return {
      protected: false,
      signals: ['trusted'],
      headline: 'Instant send — trusted recipient',
      detail: 'No undo. Funds transfer immediately.',
    }
  }

  const signals: RiskSignal[] = ['first_payment']
  let detail =
    'This is your first payment to this address (or it is not on your trusted list).'

  if (wasPasted) {
    signals.push('pasted')
    detail = 'Address was pasted from clipboard. Funds held so you can cancel.'
  }

  let large = amountWei >= LARGE_AMOUNT_MON
  if (!large && recentSendAmountsWei.length > 0) {
    const sum = recentSendAmountsWei.reduce((a, b) => a + b, 0n)
    const avg = sum / BigInt(recentSendAmountsWei.length)
    if (avg > 0n && amountWei >= avg * 5n) large = true
  }
  if (large) {
    signals.push('large_amount')
    detail =
      'Amount is larger than usual. Safety Mode holds funds until unlock.'
  }

  return {
    protected: true,
    signals,
    headline: 'Safety Mode Activated',
    detail,
  }
}

export function shortAddress(addr: string, n = 4): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 2 + n)}…${addr.slice(-n)}`
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}
