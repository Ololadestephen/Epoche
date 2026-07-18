import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createPublicClient, formatEther, http, type Address } from 'viem'
import { epocheAbi } from '../lib/epocheAbi'
import { EPOCHE_ADDRESS, isContractConfigured } from '../lib/config'
import { contractExplorerUrl } from '../lib/explorer'
import { monadTestnet } from '../lib/chains'
import { shortAddress } from '../lib/risk'

const StatusLabel = [
  'None',
  'Pending · Safety Mode',
  'Canceled',
  'Released · Final',
]

export default function HoldReceipt() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [row, setRow] = useState<{
    from: Address
    to: Address
    amount: bigint
    unlockAt: number
    status: number
  } | null>(null)
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!isContractConfigured || !id || !/^\d+$/.test(id)) {
      setErr('Invalid transfer')
      setLoading(false)
      return
    }
    const client = createPublicClient({
      chain: monadTestnet,
      transport: http(
        import.meta.env.VITE_RPC_URL || 'https://testnet-rpc.monad.xyz',
      ),
    })
    void (async () => {
      try {
        const t = await client.readContract({
          address: EPOCHE_ADDRESS,
          abi: epocheAbi,
          functionName: 'getTransfer',
          args: [BigInt(id)],
        })
        const [from, to, amount, unlockAt, status] = t as [
          Address,
          Address,
          bigint,
          bigint | number,
          number,
        ]
        if (from === '0x0000000000000000000000000000000000000000') {
          setErr('Transfer not found')
        } else {
          setRow({
            from,
            to,
            amount,
            unlockAt: Number(unlockAt),
            status: Number(status),
          })
        }
      } catch {
        setErr('Could not load transfer')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const unlocked = row ? now >= row.unlockAt : false
  const remaining = row ? Math.max(0, row.unlockAt - now) : 0

  return (
    <div className="min-h-screen bg-ink px-4 py-10 text-paper">
      <div className="mx-auto max-w-md">
        <Link
          to="/app"
          className="text-xs font-medium uppercase tracking-[0.28em] text-accent"
        >
          Epoché
        </Link>
        <h1 className="mt-2 font-display text-3xl text-paper">Hold receipt</h1>
        <p className="mt-1 text-sm text-muted">Transfer #{id}</p>

        {loading && <p className="mt-8 text-muted">Loading…</p>}
        {err && <p className="mt-8 text-danger">{err}</p>}

        {row && (
          <div className="mt-8 space-y-4 rounded-2xl border border-paper/10 bg-ink-soft p-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Amount
              </p>
              <p className="font-mono text-2xl text-paper">
                {formatEther(row.amount)} MON
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Status
              </p>
              <p className="text-lg text-paper">
                {StatusLabel[row.status] ?? 'Unknown'}
                {row.status === 1 && unlocked ? ' · unlocked' : ''}
              </p>
              {row.status === 1 && !unlocked && (
                <p className="mt-1 text-pending">
                  Unlocks in {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, '0')}
                </p>
              )}
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted">
                From{' '}
                <span className="font-mono text-paper">
                  {shortAddress(row.from)}
                </span>
              </p>
              <p className="text-muted">
                To{' '}
                <span className="font-mono text-paper">
                  {shortAddress(row.to)}
                </span>
              </p>
            </div>
            <a
              href={contractExplorerUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-accent underline-offset-2 hover:underline"
            >
              View contract on explorer
            </a>
          </div>
        )}

        <Link
          to="/app"
          className="mt-8 inline-block rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-ink"
        >
          Open command center
        </Link>
      </div>
    </div>
  )
}
