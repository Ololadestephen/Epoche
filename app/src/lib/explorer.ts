import { EPOCHE_ADDRESS } from './config'

const EXPLORER = 'https://testnet.monadvision.com'

export function contractExplorerUrl(address = EPOCHE_ADDRESS): string {
  return `${EXPLORER}/address/${address}`
}

export function txExplorerUrl(hash: `0x${string}` | string): string {
  return `${EXPLORER}/tx/${hash}`
}

export function addressExplorerUrl(address: string): string {
  return `${EXPLORER}/address/${address}`
}

export { EXPLORER }
