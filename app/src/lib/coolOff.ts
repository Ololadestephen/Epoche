/** UI presets for Safety Mode hold duration (seconds). */
export const COOL_OFF_PRESETS = [
  { label: '5 min', seconds: 5 * 60 },
  { label: '15 min', seconds: 15 * 60 },
  { label: '30 min', seconds: 30 * 60 },
] as const

export type CoolOffPresetSeconds = (typeof COOL_OFF_PRESETS)[number]['seconds']

/** Presets allowed by the contract maxCoolOff (defaults to 30m if unknown). */
export function allowedPresets(maxCoolOffSeconds?: number) {
  const max = maxCoolOffSeconds ?? 30 * 60
  return COOL_OFF_PRESETS.filter((p) => p.seconds <= max)
}

/** Pick initial selection from contract defaultCoolOff. */
export function defaultPresetSeconds(defaultCoolOffSeconds?: number): number {
  const d = defaultCoolOffSeconds ?? 15 * 60
  const match = COOL_OFF_PRESETS.find((p) => p.seconds === d)
  return match?.seconds ?? 15 * 60
}

export function formatCoolOffMinutes(seconds: number): string {
  const m = Math.round(seconds / 60)
  return m === 1 ? '1 minute' : `${m} minutes`
}
