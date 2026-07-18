import { useAccount, useSwitchChain } from 'wagmi'
import { monadTestnet } from '../lib/chains'

/** Persistent strip when the wallet is connected on the wrong chain. */
export function NetworkBanner() {
  const { isConnected, chainId } = useAccount()
  const { switchChain, isPending } = useSwitchChain()

  if (!isConnected || chainId === monadTestnet.id) return null

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pending/40 bg-pending/10 px-4 py-3 text-sm text-pending">
      <p>
        You’re on the wrong network. Epoché runs on{' '}
        <strong className="text-paper">Monad Testnet</strong> (chain{' '}
        {monadTestnet.id}).
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchChain({ chainId: monadTestnet.id })}
        className="shrink-0 rounded-full bg-pending/25 px-3 py-1.5 text-xs font-semibold text-pending hover:bg-pending/35 disabled:opacity-50"
      >
        {isPending ? 'Switching…' : 'Switch to Testnet'}
      </button>
    </div>
  )
}
