import { http, createConfig } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { monadTestnet, monadMainnet } from './chains'

export const EPOCHE_ADDRESS = (import.meta.env.VITE_EPOCHE_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as `0x${string}`

export const isContractConfigured =
  EPOCHE_ADDRESS !== '0x0000000000000000000000000000000000000000'

export const config = createConfig({
  chains: [monadTestnet, monadMainnet],
  connectors: [injected()],
  transports: {
    [monadTestnet.id]: http(
      import.meta.env.VITE_RPC_URL || 'https://testnet-rpc.monad.xyz',
    ),
    [monadMainnet.id]: http(
      import.meta.env.VITE_MAINNET_RPC_URL || 'https://rpc.monad.xyz',
    ),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
