import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { monadTestnet } from '../lib/chains'
import { shortAddress } from '../lib/risk'

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  if (!isConnected) {
    return (
      <button
        type="button"
        disabled={isPending || connectors.length === 0}
        onClick={() => connect({ connector: connectors[0] })}
        className="rounded-full border border-paper/20 bg-paper/5 px-4 py-2 text-sm font-medium text-paper transition hover:border-accent/50 hover:bg-accent/10"
      >
        {isPending ? 'Connecting…' : 'Connect wallet'}
      </button>
    )
  }

  // Contract is on Monad Testnet only — mainnet (143) has no code at this address
  const wrongChain = chainId !== monadTestnet.id

  return (
    <div className="flex items-center gap-2">
      {wrongChain && (
        <button
          type="button"
          onClick={() => switchChain({ chainId: monadTestnet.id })}
          className="rounded-full bg-pending/20 px-3 py-2 text-xs font-medium text-pending"
        >
          Switch to Monad Testnet
        </button>
      )}
      <button
        type="button"
        onClick={() => disconnect()}
        className="rounded-full border border-paper/15 px-4 py-2 font-mono text-xs text-paper/90 hover:border-paper/30"
        title="Disconnect"
      >
        {shortAddress(address!, 5)}
      </button>
    </div>
  )
}
