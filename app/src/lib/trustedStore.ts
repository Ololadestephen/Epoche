import type { Address } from 'viem'

const LIST_KEY = 'epoche.trustedList.v1'
const LABEL_KEY = 'epoche.trustedLabels.v1'
export const TRUSTED_LIST_CHANGED_EVENT = 'epoche:trusted-list-changed'

type Labels = Record<string, string>

function notifyTrustedListChanged() {
  window.dispatchEvent(new Event(TRUSTED_LIST_CHANGED_EVENT))
}

function readLabels(): Labels {
  try {
    const raw = localStorage.getItem(LABEL_KEY)
    return raw ? (JSON.parse(raw) as Labels) : {}
  } catch {
    return {}
  }
}

function writeLabels(s: Labels) {
  try {
    localStorage.setItem(LABEL_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function getTrustedLabel(addr: Address | string): string | undefined {
  return readLabels()[addr.toLowerCase()]
}

export function setTrustedLabel(addr: Address | string, label: string) {
  const s = readLabels()
  const k = addr.toLowerCase()
  if (!label.trim()) delete s[k]
  else s[k] = label.trim().slice(0, 32)
  writeLabels(s)
  notifyTrustedListChanged()
}

export function cacheTrustedAddress(addr: Address | string) {
  try {
    const raw = localStorage.getItem(LIST_KEY)
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : []
    const k = addr.toLowerCase()
    if (!list.includes(k)) {
      list.unshift(k)
      localStorage.setItem(LIST_KEY, JSON.stringify(list.slice(0, 40)))
      notifyTrustedListChanged()
    }
  } catch {
    /* ignore */
  }
}

export function uncacheTrustedAddress(addr: Address | string) {
  try {
    const raw = localStorage.getItem(LIST_KEY)
    if (!raw) return
    const list = (JSON.parse(raw) as string[]).filter(
      (a) => a !== addr.toLowerCase(),
    )
    localStorage.setItem(LIST_KEY, JSON.stringify(list))
    const labels = readLabels()
    delete labels[addr.toLowerCase()]
    writeLabels(labels)
    notifyTrustedListChanged()
  } catch {
    /* ignore */
  }
}

export function getCachedTrustedList(): string[] {
  try {
    const raw = localStorage.getItem(LIST_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}
