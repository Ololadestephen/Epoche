import { useEffect, useRef } from 'react'
import type { TransferRow } from './useEpoche'
import { Status } from './useEpoche'

/** Browser notification when a pending hold unlocks (no auto-tx). */
export function useUnlockNotify(rows: TransferRow[], enabled: boolean) {
  const notified = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined' || !('Notification' in window)) return

    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }

    const tick = () => {
      if (Notification.permission !== 'granted') return
      const now = Math.floor(Date.now() / 1000)
      for (const r of rows) {
        if (r.status !== Status.Pending) continue
        const key = r.id.toString()
        if (notified.current.has(key)) continue
        if (now < r.unlockAt) continue
        notified.current.add(key)
        try {
          new Notification('Epoché — hold unlocked', {
            body: `Transfer #${key} is claimable. The cancel window has ended.`,
            tag: `epoche-unlock-${key}`,
          })
        } catch {
          /* ignore */
        }
      }
    }

    tick()
    const t = setInterval(tick, 2000)
    return () => clearInterval(t)
  }, [rows, enabled])
}
