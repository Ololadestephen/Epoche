import { useEffect, useState, type RefObject } from 'react'

/**
 * Progress 0→1 as `ref` scrolls through the viewport.
 * Uses the element's offset height as the scrub range (sticky hero pattern).
 */
export function useScrollProgress(ref: RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const total = el.offsetHeight - window.innerHeight
      if (total <= 0) {
        setProgress(0)
        return
      }
      // How far we've scrolled through this section
      const scrolled = -rect.top
      const p = Math.min(1, Math.max(0, scrolled / total))
      setProgress(p)
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref])

  return progress
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Smoothstep ease */
export function easeInOut(t: number) {
  return t * t * (3 - 2 * t)
}
