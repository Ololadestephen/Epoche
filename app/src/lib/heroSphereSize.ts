/**
 * Pure scroll → hero sphere CSS size mapping.
 * Enlarge is driven by width/height in vmin, never CSS transform scale
 * (scale desyncs ResizeObserver/getBoundingClientRect from draw buffer).
 */

export function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Smoothstep ease 0→1 */
export function easeInOut(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

/** Compact orb at hero top (fraction of vmin). */
export const HERO_SPHERE_REST_VMIN = 58

/**
 * Deep-scroll size in vmin. ≥100 fills the shorter viewport edge when
 * centered; higher overfills for a true full-screen takeover.
 */
export const HERO_SPHERE_DEEP_VMIN = 190

/**
 * CSS box side length in vmin for a given sticky-hero scroll progress [0,1].
 * Rest is clearly smaller than deep; deep is large enough to dominate the viewport.
 */
export function heroSphereSizeVmin(progress: number): number {
  const e = easeInOut(clamp01(progress))
  return lerp(HERO_SPHERE_REST_VMIN, HERO_SPHERE_DEEP_VMIN, e)
}

/**
 * Pixel side length if the shorter viewport edge is `shortEdgePx`.
 * Useful for tests and documentation of “fills shorter dimension”.
 */
export function heroSphereSizePx(progress: number, shortEdgePx: number): number {
  return (heroSphereSizeVmin(progress) / 100) * shortEdgePx
}
