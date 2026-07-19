import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { shortAddress } from '../lib/risk'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (!isConnected) {
    return (
      <button
        type="button"
        disabled={isPending || connectors.length === 0}
        onClick={() => connect({ connector: connectors[0] })}
        className="min-h-11 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Connecting…' : 'Connect wallet'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => disconnect()}
      className="min-h-11 rounded-full border border-paper/15 px-4 py-2.5 font-mono text-xs text-paper/90 transition hover:border-paper/30"
      title="Disconnect"
    >
      {shortAddress(address!, 5)}
    </button>
  )
}
