import { useEffect, useRef } from 'react'

/** Optimized loop from animated_rotate2.mp4 (web-encoded, black plate). */
export const SPHERE_VIDEO_SRC = '/animated_rotate2.mp4'

type SphereVisualProps = {
  className?: string
  alt?: string
  /** When false / reduced-motion: pause on first frame. */
  animate?: boolean
  /**
   * preload strategy — hero uses metadata+eager play; secondary can use metadata
   * to avoid double full-buffer lag.
   */
  preload?: 'auto' | 'metadata' | 'none'
}

/**
 * Shared particle sphere: plays animated_rotate2.mp4.
 * mix-blend-mode: screen removes black plate on app black (hero + Safety Mode).
 */
export function SphereVisual({
  className = '',
  alt = 'Animated particle sphere',
  animate = true,
  preload = 'auto',
}: SphereVisualProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    v.muted = true
    v.defaultMuted = true
    v.playsInline = true
    v.loop = true
    v.setAttribute('playsinline', '')
    v.setAttribute('webkit-playsinline', '')

    if (!animate || reduced) {
      v.pause()
      try {
        v.currentTime = 0
      } catch {
        /* ignore */
      }
      return
    }

    const tryPlay = () => {
      const p = v.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    }

    tryPlay()
    v.addEventListener('canplay', tryPlay, { once: true })
    return () => {
      v.removeEventListener('canplay', tryPlay)
      v.pause()
    }
  }, [animate])

  return (
    <div
      className={`sphere-visual relative aspect-square overflow-hidden bg-black ${className}`}
      role="img"
      aria-label={alt}
    >
      <video
        ref={videoRef}
        className="sphere-video pointer-events-none absolute inset-0 h-full w-full object-contain object-center"
        src={SPHERE_VIDEO_SRC}
        muted
        loop
        playsInline
        autoPlay
        preload={preload}
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden
      />
    </div>
  )
}

export const SPHERE_SRC = SPHERE_VIDEO_SRC
