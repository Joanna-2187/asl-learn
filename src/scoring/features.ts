import { angleAt, distance, normalize, sub } from '../lib/geometry.ts'
import type { LandmarkList, Point3D } from '../lib/types.ts'

/** Bump when the feature layout changes; templates store the version they were built with. */
export const FEATURE_VERSION = 1

const FINGER_JOINTS = [
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
] as const

export const FEATURE_NAMES: string[] = [
  // 4 fingers x 3 flexion angles (MCP, PIP, DIP), degrees
  ...['index', 'middle', 'ring', 'pinky'].flatMap((f) => [`${f}Mcp`, `${f}Pip`, `${f}Dip`]),
  // thumb flexion: CMC-MCP-IP, MCP-IP-tip
  'thumbMcp',
  'thumbIp',
  // thumb abduction: angle between thumb metacarpal and index metacarpal
  'thumbAbduction',
  // finger spread: angle between neighbouring proximal phalanges
  'spreadIndexMiddle',
  'spreadMiddleRing',
  'spreadRingPinky',
  // fingertip distances divided by palm size
  'thumbIndexTip',
  'thumbMiddleTip',
  'thumbRingTip',
  'thumbPinkyTip',
  'indexMiddleTip',
  'thumbTipIndexPip',
  'thumbTipIndexMcp',
  'thumbTipMiddleMcp',
  // hand direction in the camera frame (mirror-safe: |x|, y, z)
  'dirAbsX',
  'dirY',
  'dirZ',
]

export type FeatureVector = number[]

export interface FeatureOptions {
  /** Mirror x so a left hand is scored in a right-hand frame. */
  mirror?: boolean
  /** Width/height of the source image, for image-normalized landmarks. Leave unset for world landmarks. */
  imageAspect?: number
}

function prepare(landmarks: LandmarkList, opts: FeatureOptions): LandmarkList {
  const sx = (opts.mirror ? -1 : 1) * (opts.imageAspect ?? 1)
  return landmarks.map((p) => ({ x: p.x * sx, y: p.y, z: p.z * (opts.imageAspect ?? 1) }))
}

function vecAngle(a: Point3D, b: Point3D): number {
  const na = normalize(a)
  const nb = normalize(b)
  const c = Math.min(1, Math.max(-1, na.x * nb.x + na.y * nb.y + na.z * nb.z))
  return (Math.acos(c) * 180) / Math.PI
}

/**
 * Hand-size-invariant feature vector. Pass MediaPipe worldLandmarks in the app;
 * pass image landmarks plus `imageAspect` when working with image-normalized datasets.
 */
export function extractFeatures(landmarks: LandmarkList, opts: FeatureOptions = {}): FeatureVector {
  const p = prepare(landmarks, opts)
  const palmSize = distance(p[0], p[9]) || 1e-6
  const f: number[] = []

  for (const [mcp, pip, dip, tip] of FINGER_JOINTS) {
    f.push(angleAt(p[0], p[mcp], p[pip]), angleAt(p[mcp], p[pip], p[dip]), angleAt(p[pip], p[dip], p[tip]))
  }
  f.push(angleAt(p[1], p[2], p[3]), angleAt(p[2], p[3], p[4]))
  f.push(vecAngle(sub(p[2], p[1]), sub(p[5], p[0])))
  f.push(
    vecAngle(sub(p[6], p[5]), sub(p[10], p[9])),
    vecAngle(sub(p[10], p[9]), sub(p[14], p[13])),
    vecAngle(sub(p[14], p[13]), sub(p[18], p[17])),
  )
  const d = (a: number, b: number) => distance(p[a], p[b]) / palmSize
  f.push(d(4, 8), d(4, 12), d(4, 16), d(4, 20), d(8, 12), d(4, 6), d(4, 5), d(4, 9))

  const dir = normalize(sub(p[9], p[0]))
  f.push(Math.abs(dir.x), dir.y, dir.z)
  return f
}

/** Minimum spread per feature so tiny sample variance can't make a template brittle. */
export const FEATURE_FLOOR: number[] = FEATURE_NAMES.map((_, i) => (i < 18 ? 8 : i < 26 ? 0.08 : 0.1))
