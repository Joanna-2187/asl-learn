export interface Settings {
  leftHand: boolean
  ghost: boolean
}

const KEY = 'asl-learn.settings.v1'
export const DEFAULT_SETTINGS: Settings = { leftHand: false, ghost: false }

export function loadSettings(): Settings {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const p = JSON.parse(raw) as Partial<Settings>
    return { leftHand: p.leftHand === true, ghost: p.ghost === true }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Storage unavailable; settings just won't persist.
  }
}
