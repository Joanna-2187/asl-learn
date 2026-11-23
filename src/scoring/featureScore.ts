import { isCompatible, classify } from './classify.ts'
import { FEATURE_NAMES, extractFeatures } from './features.ts'
import type { LandmarkList, LetterTarget, ScoreResult } from '../lib/types.ts'
import type { TemplateSet } from '../data/templates/schema.ts'

const FINGER_LABEL: Record<string, string> = { index: 'index', middle: 'middle', ring: 'ring', pinky: 'pinky', thumb: 'thumb' }

/** Turns one badly-off feature into a short instruction. `delta` = actual - expected. */
function hintFor(name: string, delta: number): string | null {
  const joint = /^(index|middle|ring|pinky|thumb)(Mcp|Pip|Dip|Ip)$/.exec(name)
  if (joint) {
    const finger = joint[1] === 'thumb' ? 'thumb' : `${FINGER_LABEL[joint[1]]} finger`
    // Joint angle: 180 degrees is straight, smaller is more bent.
    return delta < 0 ? `straighten your ${finger}` : `curl your ${finger} more`
  }
  switch (name) {
    case 'thumbAbduction':
      return delta > 0 ? 'bring your thumb in toward your palm' : 'move your thumb away from your palm'
    case 'spreadIndexMiddle':
      return delta > 0 ? 'bring your index and middle fingers together' : 'spread your index and middle fingers apart'
    case 'spreadMiddleRing':
      return delta > 0 ? 'bring your middle and ring fingers together' : 'spread your middle and ring fingers apart'
    case 'spreadRingPinky':
      return delta > 0 ? 'bring your ring and pinky fingers together' : 'spread your ring and pinky fingers apart'
    case 'thumbIndexTip':
      return delta > 0 ? 'bring your thumb tip closer to your index fingertip' : 'move your thumb tip away from your index fingertip'
    case 'thumbMiddleTip':
      return delta > 0 ? 'bring your thumb tip closer to your middle fingertip' : 'move your thumb tip away from your middle fingertip'
    case 'thumbRingTip':
      return delta > 0 ? 'bring your thumb tip closer to your ring fingertip' : 'move your thumb tip away from your ring fingertip'
    case 'thumbPinkyTip':
      return delta > 0 ? 'bring your thumb tip closer to your pinky fingertip' : 'move your thumb tip away from your pinky fingertip'
    case 'indexMiddleTip':
      return delta > 0 ? 'bring your index and middle fingertips together' : 'separate your index and middle fingertips'
    case 'thumbTipIndexPip':
    case 'thumbTipIndexMcp':
      return delta > 0 ? 'bring your thumb closer to your index finger' : 'move your thumb away from your index finger'
    case 'thumbTipMiddleMcp':
      return delta > 0 ? 'bring your thumb closer to your middle finger' : 'move your thumb away from your middle finger'
    case 'dirAbsX':
    case 'dirY':
    case 'dirZ':
      return 'tilt your hand to match the reference orientation'
    default:
      return null
  }
}

function worstHints(features: number[], mean: number[], spread: number[], count: number): string[] {
  const ranked = features
    .map((v, i) => ({ i, z: (v - mean[i]) / spread[i], delta: v - mean[i] }))
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
  const out: string[] = []
  for (const r of ranked) {
    if (Math.abs(r.z) < 1.5) break
    const h = hintFor(FEATURE_NAMES[r.i], r.delta)
    if (h && !out.includes(h)) out.push(h)
    if (out.length >= count) break
  }
  return out
}

export interface FeatureScoreOptions {
  /** Mirror a left hand into the right-hand frame the templates were built in. */
  leftHand?: boolean
}

export function scoreWithFeatures(
  landmarks: LandmarkList | null | undefined,
  target: LetterTarget,
  templates: TemplateSet,
  opts: FeatureScoreOptions = {},
): ScoreResult {
  if (!landmarks || landmarks.length < 21) {
    return {
      handDetected: false,
      handshape: { ok: false, message: 'No hand detected. Show your hand clearly in the camera frame.' },
      pass: false,
    }
  }
  const template = templates.letters[target.letter]
  if (!template || !isCompatible(templates)) {
    return {
      handDetected: true,
      handshape: { ok: false, message: 'No template available for this letter.' },
      pass: false,
    }
  }

  const f = extractFeatures(landmarks, { mirror: opts.leftHand })
  const c = classify(f, target.letter, templates)
  const hints = worstHints(f, template.mean, template.spread, 2)

  let handshapeMsg = 'Handshape looks good.'
  if (!c.withinTolerance) {
    const lookLike = c.best.letter !== target.letter ? ` That looks more like ${c.best.letter}.` : ''
    handshapeMsg = hints.length
      ? `Adjust: ${hints.join('; ')}.${lookLike}`
      : `Not quite ${target.letter} yet. ${target.handshapeTip}${lookLike}`
  }

  const rival = c.rival
  let lookalikeMsg = 'Clearly different from look-alike letters.'
  if (!c.marginOk && rival) {
    lookalikeMsg = `Too close to ${rival.letter}. ${hints.length ? `Try to ${hints[0]}.` : target.handshapeTip}`
  }

  const margin = rival ? rival.distance - c.distance : 1
  return {
    handDetected: true,
    handshape: { ok: c.withinTolerance, message: handshapeMsg },
    lookalike: { ok: c.marginOk, message: lookalikeMsg },
    margin,
    pass: c.pass,
  }
}
