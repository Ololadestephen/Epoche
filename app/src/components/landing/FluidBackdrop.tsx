/**
 * Flat solid backdrop (no gradients). Kept for optional dark sections.
 */
export function FluidBackdrop({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 bg-black ${className}`}
      aria-hidden
    />
  )
}
