import { LETTER_ORDER } from '../data/letters.ts'
import type { AttemptRecord, LetterProgress, ProgressMap, StoredCard } from './types.ts'

export const PROGRESS_SCHEMA_VERSION = 2
export const MAX_RECENT_ATTEMPTS = 50

const KEY_V1 = 'asl-learn.progress.v1'
const KEY_V2 = 'asl-learn.progress.v2'

export interface ProgressFile {
  schemaVersion: number
  app: 'asl-learn'
  exportedAt?: string
  letters: ProgressMap
}

export function emptyProgress(_letter?: string): LetterProgress {
  return { attempts: 0, passes: 0, lastResult: null, lastPracticedAt: null, recent: [], card: null }
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0
}

function cleanCard(c: unknown): StoredCard | null {
  if (!c || typeof c !== 'object') return null
  const o = c as Record<string, unknown>
  if (typeof o.due !== 'string' || Number.isNaN(Date.parse(o.due))) return null
  return {
    due: o.due,
    stability: num(o.stability),
    difficulty: num(o.difficulty),
    scheduled_days: num(o.scheduled_days),
    learning_steps: num(o.learning_steps),
    reps: num(o.reps),
    lapses: num(o.lapses),
    state: num(o.state),
    last_review: typeof o.last_review === 'string' ? o.last_review : null,
  }
}

/** Validates and normalizes one letter's data from any version (v1 entries lack `recent` and `card`). */
function cleanLetter(v: unknown): LetterProgress | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const recent: AttemptRecord[] = Array.isArray(o.recent)
    ? o.recent
        .filter((r): r is AttemptRecord => !!r && typeof (r as AttemptRecord).t === 'string' && typeof (r as AttemptRecord).pass === 'boolean')
        .slice(-MAX_RECENT_ATTEMPTS)
    : []
  return {
    attempts: num(o.attempts),
    passes: num(o.passes),
    lastResult: o.lastResult === 'pass' || o.lastResult === 'try-again' ? o.lastResult : null,
    lastPracticedAt: typeof o.lastPracticedAt === 'string' ? o.lastPracticedAt : null,
    recent,
    card: cleanCard(o.card),
  }
}

/** Brings any saved shape up to the current one. Unknown or broken letters are dropped. */
export function migrateProgress(input: unknown): ProgressMap {
  if (!input || typeof input !== 'object') return {}
  const o = input as Record<string, unknown>
  // v2 wraps letters in { schemaVersion, letters }; v1 was the bare letter map.
  const source =
    typeof o.schemaVersion === 'number' && o.letters && typeof o.letters === 'object' ? (o.letters as Record<string, unknown>) : o
  const out: ProgressMap = {}
  for (const letter of LETTER_ORDER) {
    const clean = cleanLetter(source[letter])
    if (clean) out[letter] = clean
  }
  return out
}

export function loadProgress(): ProgressMap {
  if (typeof localStorage === 'undefined') return {}
  try {
    const v2 = localStorage.getItem(KEY_V2)
    if (v2) return migrateProgress(JSON.parse(v2))
    const v1 = localStorage.getItem(KEY_V1)
    if (v1) {
      const migrated = migrateProgress(JSON.parse(v1))
      saveProgress(migrated)
      return migrated
    }
  } catch {
    // Corrupt data: start fresh rather than crash.
  }
  return {}
}

export function saveProgress(progress: ProgressMap): void {
  if (typeof localStorage === 'undefined') return
  try {
    const file: ProgressFile = { schemaVersion: PROGRESS_SCHEMA_VERSION, app: 'asl-learn', letters: progress }
    localStorage.setItem(KEY_V2, JSON.stringify(file))
  } catch {
    // Ignore storage errors (private mode/quota); app remains usable without persistence.
  }
}

export function recordAttempt(progress: ProgressMap, letter: string, pass: boolean, card?: StoredCard): ProgressMap {
  const prev = progress[letter] ?? emptyProgress(letter)
  const now = new Date().toISOString()
  const next: ProgressMap = {
    ...progress,
    [letter]: {
      attempts: prev.attempts + 1,
      passes: prev.passes + (pass ? 1 : 0),
      lastResult: pass ? 'pass' : 'try-again',
      lastPracticedAt: now,
      recent: [...prev.recent, { t: now, pass }].slice(-MAX_RECENT_ATTEMPTS),
      card: card ?? prev.card,
    },
  }
  saveProgress(next)
  return next
}

export function getLetterProgress(progress: ProgressMap, letter: string): LetterProgress {
  return progress[letter] ?? emptyProgress(letter)
}

export function getOverallStats(progress: ProgressMap): { practiced: number; passed: number; total: number } {
  let practiced = 0
  let passed = 0
  for (const letter of LETTER_ORDER) {
    const p = progress[letter]
    if (p && p.attempts > 0) practiced += 1
    if (p && p.passes > 0) passed += 1
  }
  return { practiced, passed, total: LETTER_ORDER.length }
}

export function exportProgress(progress: ProgressMap): string {
  const file: ProgressFile = {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    app: 'asl-learn',
    exportedAt: new Date().toISOString(),
    letters: progress,
  }
  return JSON.stringify(file, null, 2)
}

export type ImportResult = { ok: true; progress: ProgressMap; letters: number } | { ok: false; error: string }

/** Parses an exported file. Rejects wrong app, future schema versions and non-JSON. */
export function importProgress(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, error: 'That file is not a progress export.' }
  const o = parsed as Record<string, unknown>
  if (o.app !== 'asl-learn' || typeof o.schemaVersion !== 'number') return { ok: false, error: 'That file was not exported by this app.' }
  if (o.schemaVersion > PROGRESS_SCHEMA_VERSION) return { ok: false, error: 'That file is from a newer version of the app.' }
  const progress = migrateProgress(o)
  return { ok: true, progress, letters: Object.keys(progress).length }
}
