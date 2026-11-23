import { describe, expect, it } from 'vitest'
import { angleAt, distance, normalize } from './geometry.ts'

const p = (x: number, y: number, z = 0) => ({ x, y, z })

describe('geometry', () => {
  it('measures joint angles', () => {
    expect(angleAt(p(0, 1), p(0, 0), p(0, -1))).toBeCloseTo(180)
    expect(angleAt(p(1, 0), p(0, 0), p(0, 1))).toBeCloseTo(90)
    expect(angleAt(p(1, 0), p(0, 0), p(1, 0))).toBeCloseTo(0)
  })

  it('returns 0 for a degenerate angle', () => {
    expect(angleAt(p(0, 0), p(0, 0), p(1, 1))).toBe(0)
  })

  it('computes distance in 3D', () => {
    expect(distance(p(0, 0, 0), p(1, 2, 2))).toBeCloseTo(3)
  })

  it('normalizes vectors and tolerates zero', () => {
    expect(normalize(p(0, 3, 4))).toEqual(p(0, 0.6, 0.8))
    expect(normalize(p(0, 0, 0))).toEqual(p(0, 0, 0))
  })
})
