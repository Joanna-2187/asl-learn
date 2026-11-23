import { FEATURE_VERSION } from '../../scoring/features.ts'

export const TEMPLATE_SCHEMA_VERSION = 1

export interface LetterTemplate {
  letter: string
  samples: number
  mean: number[]
  /** Per-feature standard deviation, already floored. */
  spread: number[]
  /** Distance below which the target counts as a match. */
  tolerance: number
  /** Required gap between the target's distance and the nearest other letter's. */
  margin: number
}

export interface TemplateSet {
  schemaVersion: typeof TEMPLATE_SCHEMA_VERSION
  featureVersion: typeof FEATURE_VERSION
  source: string
  letters: Record<string, LetterTemplate>
  /** Ghost-overlay shapes: 21 [x, y] points per letter, wrist at the origin, scaled so wrist-to-middle-MCP = 1. */
  ghosts?: Record<string, [number, number][]>
}
