import type { Address } from 'viem'

const KEY = 'epoche.recentRecipients.v1'

export function pushRecentRecipient(addr: Address | string) {
  try {
    const k = addr.toLowerCase()
    if (!/^0x[a-f0-9]{40}$/.test(k)) return
    const raw = localStorage.getItem(KEY)
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : []
    const next = [k, ...list.filter((a) => a !== k)].slice(0, 8)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function getRecentRecipients(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}
