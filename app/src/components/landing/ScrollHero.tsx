import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { SphereVisual } from './SphereVisual'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import {
  HERO_SPHERE_DEEP_VMIN,
  heroSphereSizeVmin,
} from '../../lib/heroSphereSize'

/**
 * Sticky hero: larger video sphere at rest → full-viewport enlarge on scroll.
 * Layout box is fixed at deep size; enlarge uses GPU transform:scale only.
 */
export function ScrollHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const progress = useScrollProgress(sectionRef)

  const targetVmin = heroSphereSizeVmin(progress)
  const scale = targetVmin / HERO_SPHERE_DEEP_VMIN

  const textOpacity =
    progress < 0.08 ? 1 : Math.max(0, 1 - (progress - 0.08) / 0.28)
  const textY = progress < 0.4 ? progress * -120 : -48
  const textScale = 1 - Math.min(1, progress / 0.38) * 0.1

  const midOpacity =
    progress < 0.36
      ? 0
      : progress < 0.48
        ? (progress - 0.36) / 0.12
        : progress < 0.84
          ? 1
          : Math.max(0, 1 - (progress - 0.84) / 0.12)

  const stageOpacity =
    progress > 0.92 ? Math.max(0.45, 1 - (progress - 0.92) / 0.08) : 1

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative h-[300vh] bg-black"
      aria-label="Hero"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-black">
        <div
          className="absolute inset-0 z-[1] flex items-center justify-center bg-black"
          style={{ opacity: stageOpacity }}
        >
          <div
            className="relative shrink-0 will-change-transform"
            style={{
              width: `${HERO_SPHERE_DEEP_VMIN}vmin`,
              height: `${HERO_SPHERE_DEEP_VMIN}vmin`,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            <SphereVisual
              className="h-full w-full"
              animate
              preload="auto"
              alt="Animated particle sphere"
            />
          </div>
        </div>

        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 text-center sm:px-8"
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px) scale(${textScale})`,
            pointerEvents: textOpacity < 0.15 ? 'none' : 'auto',
          }}
        >
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.28em] text-white">
            Send crypto with a safety net
          </p>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.08] text-white sm:text-5xl md:text-[3.5rem]">
            A few minutes to undo a wrong send.
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-sm font-normal leading-relaxed text-white sm:text-[15px]">
            When you pay someone new, we hold the money briefly so you can
            cancel if the address is wrong. People you trust get paid right
            away.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/app"
              className="rounded-sm bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-accent-soft"
            >
              Open app
            </Link>
            <a
              href="#how"
              className="rounded-sm border border-white/40 bg-black/40 px-6 py-3 text-sm font-medium text-white transition hover:border-white/60"
            >
              How it works
            </a>
          </div>
        </div>

        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 text-center"
          style={{
            opacity: midOpacity,
            pointerEvents: midOpacity < 0.25 ? 'none' : 'auto',
          }}
        >
          <p className="font-display text-[1.65rem] font-semibold leading-snug text-white sm:text-4xl md:text-[2.75rem]">
            Hold. Check.
            <br />
            Then send.
          </p>
          <p className="mt-4 max-w-xs text-sm text-white">
            Pause · cancel if wrong · or let it through
          </p>
          <Link
            to="/app"
            className="mt-8 rounded-sm bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-soft"
          >
            Open app
          </Link>
        </div>

        <div
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-center"
          style={{ opacity: Math.max(0, 1 - progress * 4) }}
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/35">
            Scroll
          </p>
          <div className="mx-auto mt-2 h-8 w-px bg-white/35" />
        </div>
      </div>
    </section>
  )
}
