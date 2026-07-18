import { defineChain } from 'viem'

/** Standard Multicall3 — deployed on Monad testnet + mainnet */
const multicall3 = {
  address: '0xcA11bde05977b3631167028862bE2a173976CA11' as const,
  blockCreated: 0,
}

/** Monad Testnet — https://docs.monad.xyz */
export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: {
      name: 'MonadVision',
      url: 'https://testnet.monadvision.com',
    },
  },
  contracts: { multicall3 },
  testnet: true,
})

/** Monad Mainnet */
export const monadMainnet = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: {
      name: 'MonadVision',
      url: 'https://monadvision.com',
    },
  },
  contracts: { multicall3 },
})
