import { describe, expect, it } from 'vitest'
import { MAX_RECENT_ATTEMPTS, exportProgress, importProgress, migrateProgress } from './progress.ts'
import { buildReviewQueue, gradeFromResult, reviewCard } from './srs.ts'

describe('progress migration', () => {
  it('upgrades a v1 map without losing counts', () => {
    const v1 = { A: { attempts: 3, passes: 2, lastResult: 'pass', lastPracticedAt: '2026-11-01T00:00:00.000Z' } }
    const out = migrateProgress(v1)
    expect(out.A.attempts).toBe(3)
    expect(out.A.passes).toBe(2)
    expect(out.A.recent).toEqual([])
    expect(out.A.card).toBeNull()
  })

  it('drops unknown letters and garbage', () => {
    expect(migrateProgress({ '?': { attempts: 1 }, A: 'nope' })).toEqual({})
    expect(migrateProgress(null)).toEqual({})
  })

  it('caps recent attempts', () => {
    const recent = Array.from({ length: 80 }, (_, i) => ({ t: `2026-11-01T00:00:${String(i % 60).padStart(2, '0')}Z`, pass: true }))
    const out = migrateProgress({ A: { attempts: 80, passes: 80, recent } })
    expect(out.A.recent).toHaveLength(MAX_RECENT_ATTEMPTS)
  })

  it('round-trips through export and import, including review cards', () => {
    const card = reviewCard(null, 'good', new Date('2026-11-01T00:00:00Z'))
    const progress = migrateProgress({ A: { attempts: 1, passes: 1, lastResult: 'pass', lastPracticedAt: 'x', card } })
    const result = importProgress(exportProgress(progress))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.progress).toEqual(progress)
  })

  it('rejects files from other apps and newer versions', () => {
    expect(importProgress('not json').ok).toBe(false)
    expect(importProgress(JSON.stringify({ app: 'other', schemaVersion: 2, letters: {} })).ok).toBe(false)
    expect(importProgress(JSON.stringify({ app: 'asl-learn', schemaVersion: 99, letters: {} })).ok).toBe(false)
  })
})

describe('review queue', () => {
  it('puts due letters first, then new letters, capped', () => {
    const past = reviewCard(null, 'good', new Date('2020-01-01T00:00:00Z'))
    const future = reviewCard(null, 'easy', new Date('2099-01-01T00:00:00Z'))
    const progress = migrateProgress({
      C: { attempts: 1, passes: 1, card: past },
      D: { attempts: 1, passes: 1, card: future },
    })
    const q = buildReviewQueue(progress, new Date('2026-11-23T00:00:00Z'))
    expect(q[0]).toBe('C')
    expect(q).not.toContain('D')
    expect(q).toHaveLength(15)
  })

  it('maps results to ratings', () => {
    expect(gradeFromResult(false, 0.9, 1)).toBe('again')
    expect(gradeFromResult(true, 0.05, 3)).toBe('hard')
    expect(gradeFromResult(true, 0.3, 8)).toBe('good')
    expect(gradeFromResult(true, 0.7, 3)).toBe('easy')
  })
})
