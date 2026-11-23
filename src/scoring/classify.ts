import { TEMPLATE_SCHEMA_VERSION } from '../data/templates/schema.ts'
import type { LetterTemplate, TemplateSet } from '../data/templates/schema.ts'
import { FEATURE_FLOOR, FEATURE_NAMES, FEATURE_VERSION } from './features.ts'
import type { FeatureVector } from './features.ts'

/** Letters that are easy to confuse; a pass must beat these by the template's margin. */
export const CONFUSABLE: Record<string, string[]> = {
  A: ['S', 'E', 'T', 'M', 'N'],
  S: ['A', 'E', 'T', 'M', 'N'],
  E: ['A', 'S', 'T', 'M', 'N'],
  T: ['A', 'S', 'E', 'M', 'N'],
  M: ['A', 'S', 'E', 'T', 'N'],
  N: ['A', 'S', 'E', 'T', 'M'],
  U: ['V', 'R'],
  V: ['U', 'R', 'K'],
  R: ['U', 'V'],
  K: ['V', 'P'],
  P: ['K', 'V'],
  G: ['H'],
  H: ['G'],
  I: ['Y'],
  Y: ['I'],
  O: ['C'],
  C: ['O'],
}

/** RMS of per-feature z-scores; ~1 means "typical sample of this letter". */
export function templateDistance(f: FeatureVector, t: LetterTemplate): number {
  let sum = 0
  for (let i = 0; i < f.length; i++) {
    const z = (f[i] - t.mean[i]) / t.spread[i]
    sum += z * z
  }
  return Math.sqrt(sum / f.length)
}

export function buildTemplate(
  letter: string,
  samples: FeatureVector[],
  params: { tolerance: number; margin: number } = { tolerance: 2, margin: 0.2 },
): LetterTemplate {
  const n = samples.length
  const mean = FEATURE_NAMES.map((_, i) => samples.reduce((a, s) => a + s[i], 0) / n)
  const spread = FEATURE_NAMES.map((_, i) => {
    const v = samples.reduce((a, s) => a + (s[i] - mean[i]) ** 2, 0) / Math.max(1, n - 1)
    return Math.max(Math.sqrt(v), FEATURE_FLOOR[i])
  })
  return { letter, samples: n, mean, spread, ...params }
}

export interface Classification {
  target: string
  distance: number
  /** Nearest other letter overall, and the gap to the target. */
  best: { letter: string; distance: number }
  rival: { letter: string; distance: number } | null
  marginOk: boolean
  withinTolerance: boolean
  pass: boolean
}

export function classify(f: FeatureVector, target: string, set: TemplateSet): Classification {
  const t = set.letters[target]
  const distance = templateDistance(f, t)
  let best = { letter: target, distance }
  for (const [letter, other] of Object.entries(set.letters)) {
    const d = templateDistance(f, other)
    if (d < best.distance) best = { letter, distance: d }
  }
  let rival: Classification['rival'] = null
  for (const letter of CONFUSABLE[target] ?? []) {
    const other = set.letters[letter]
    if (!other) continue
    const d = templateDistance(f, other)
    if (!rival || d < rival.distance) rival = { letter, distance: d }
  }
  const withinTolerance = distance <= t.tolerance
  const marginOk = !rival || rival.distance - distance >= t.margin
  return { target, distance, best, rival, marginOk, withinTolerance, pass: withinTolerance && marginOk }
}

export function isCompatible(set: TemplateSet): boolean {
  return set.schemaVersion === TEMPLATE_SCHEMA_VERSION && set.featureVersion === FEATURE_VERSION
}

/** Groups used by the look-alike drill. */
export const CONFUSABLE_GROUPS: string[][] = [
  ['A', 'S', 'E', 'T', 'M', 'N'],
  ['U', 'V', 'R'],
  ['K', 'V', 'P'],
  ['G', 'H'],
  ['I', 'Y'],
  ['O', 'C'],
]
