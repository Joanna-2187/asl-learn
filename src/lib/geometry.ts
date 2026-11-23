import type { Point3D } from './types.ts'

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

export function sub(a: Point3D, b: Point3D): Point3D {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function dot(a: Point3D, b: Point3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

export function magnitude(v: Point3D): number {
  return Math.sqrt(dot(v, v))
}

export function normalize(v: Point3D): Point3D {
  const m = magnitude(v)
  if (m < 1e-8) return { x: 0, y: 0, z: 0 }
  return { x: v.x / m, y: v.y / m, z: v.z / m }
}

export function distance(a: Point3D, b: Point3D): number {
  return magnitude(sub(a, b))
}

/** Angle in degrees at b between the segments b->a and b->c (180 = straight). */
export function angleAt(a: Point3D, b: Point3D, c: Point3D): number {
  const ba = sub(a, b)
  const bc = sub(c, b)
  const denom = magnitude(ba) * magnitude(bc)
  if (denom < 1e-8) return 0
  const cos = Math.min(1, Math.max(-1, dot(ba, bc) / denom))
  return (Math.acos(cos) * 180) / Math.PI
}
