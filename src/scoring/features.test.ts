import { describe, expect, it } from 'vitest'
import { extractFeatures, FEATURE_NAMES } from './features.ts'
import type { LandmarkList } from '../lib/types.ts'

// Flat open hand pointing up, roughly MediaPipe's layout.
function openHand(): LandmarkList {
  const pts: LandmarkList = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }))
  pts[0] = { x: 0, y: 0, z: 0 }
  const cols = [-0.04, -0.01, 0.02, 0.05]
  ;[5, 9, 13, 17].forEach((mcp, i) => {
    for (let j = 0; j < 4; j++) pts[mcp + j] = { x: cols[i], y: -0.09 - j * 0.03, z: 0 }
  })
  pts[1] = { x: -0.03, y: -0.02, z: 0 }
  pts[2] = { x: -0.05, y: -0.04, z: 0 }
  pts[3] = { x: -0.07, y: -0.06, z: 0 }
  pts[4] = { x: -0.09, y: -0.08, z: 0 }
  return pts
}

describe('extractFeatures', () => {
  it('returns one value per named feature', () => {
    expect(extractFeatures(openHand())).toHaveLength(FEATURE_NAMES.length)
  })

  it('is invariant to hand size', () => {
    const big = openHand().map((p) => ({ x: p.x * 3, y: p.y * 3, z: p.z * 3 }))
    const a = extractFeatures(openHand())
    const b = extractFeatures(big)
    a.forEach((v, i) => expect(b[i]).toBeCloseTo(v, 4))
  })

  it('mirroring a mirrored hand restores the original features', () => {
    const mirrored = openHand().map((p) => ({ ...p, x: -p.x }))
    const a = extractFeatures(openHand())
    const b = extractFeatures(mirrored, { mirror: true })
    a.forEach((v, i) => expect(b[i]).toBeCloseTo(v, 4))
  })
})
