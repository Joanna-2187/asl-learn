import { describe, expect, it } from 'vitest'
import templates from '../data/templates/aslnow.json'
import type { TemplateSet } from '../data/templates/schema.ts'
import { classify } from './classify.ts'

const set = templates as unknown as TemplateSet

describe('templates', () => {
  it('every letter template classifies its own mean as that letter', () => {
    for (const [letter, t] of Object.entries(set.letters)) {
      const c = classify(t.mean, letter, set)
      expect(c.best.letter, letter).toBe(letter)
      expect(c.withinTolerance, letter).toBe(true)
    }
  })

  it('has a ghost shape of 21 points per letter', () => {
    for (const letter of Object.keys(set.letters)) expect(set.ghosts?.[letter]).toHaveLength(21)
  })

  it('does not pass a clearly different letter', () => {
    expect(classify(set.letters.B.mean, 'A', set).pass).toBe(false)
  })
})
