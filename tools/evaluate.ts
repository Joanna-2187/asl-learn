// Usage: node tools/evaluate.ts <aslnow-dir> [--aspect 1.778] [--tol 99] [--margin 0.05] [--seed 1] [--export src/data/templates/aslnow.json]
// Builds templates from half of the ASL-Now samples and scores the other half.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { join } from 'node:path'
import { CONFUSABLE, buildTemplate, classify, templateDistance } from '../src/scoring/classify.ts'
import { extractFeatures } from '../src/scoring/features.ts'
import type { FeatureVector } from '../src/scoring/features.ts'
import { FEATURE_VERSION } from '../src/scoring/features.ts'
import { TEMPLATE_SCHEMA_VERSION } from '../src/data/templates/schema.ts'
import type { TemplateSet } from '../src/data/templates/schema.ts'

const args = process.argv.slice(2)
const dir = args[0]
const opt = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? Number(args[i + 1]) : def
}
const aspect = opt('aspect', 16 / 9)
const tolPct = opt('tol', 99)
const margin = opt('margin', 0.05)
let seed = opt('seed', 1)
const dedupe = opt('dedupe', 0.2)
if (!dir) throw new Error('Pass the dataset directory')

const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const STATIC = 'ABCDEFGHIKLMNOPQRSTUVWXY'.split('')

const data: Record<string, FeatureVector[]> = {}
const rawOf = new Map<FeatureVector, { x: number; y: number; z: number }[]>()
for (const letter of readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory())) {
  data[letter] = readdirSync(join(dir, letter))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, letter, f), 'utf8')))
    .filter((lm) => Array.isArray(lm) && lm.length === 21)
    .map((lm) => {
      const f = extractFeatures(lm, { imageAspect: aspect })
      rawOf.set(f, lm)
      return f
    })
}

function dist(a: FeatureVector, b: FeatureVector) {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0) / a.length)
}
// Frames of one session look nearly identical; drop near-duplicates so the test set isn't trivially easy.
function thin(samples: FeatureVector[]) {
  const kept: FeatureVector[] = []
  const scale = samples[0].map((_, i) => (i < 18 ? 30 : i < 26 ? 0.3 : 0.3))
  for (const s of samples) {
    const sn = s.map((v, i) => v / scale[i])
    if (!kept.some((k) => dist(sn, k.map((v, i) => v / scale[i])) < dedupe)) kept.push(s)
  }
  return kept
}

const train: Record<string, FeatureVector[]> = {}
const test: Record<string, FeatureVector[]> = {}
for (const l of STATIC) {
  const all = thin(data[l]).sort(() => rand() - 0.5)
  const cut = Math.ceil(all.length / 2)
  train[l] = all.slice(0, cut)
  test[l] = all.slice(cut)
}

const set: TemplateSet = { schemaVersion: TEMPLATE_SCHEMA_VERSION, featureVersion: FEATURE_VERSION, source: 'asl-now', letters: {} }
for (const l of STATIC) {
  const t = buildTemplate(l, train[l], { tolerance: 0, margin })
  const ds = train[l].map((s) => templateDistance(s, t)).sort((a, b) => a - b)
  t.tolerance = ds[Math.min(ds.length - 1, Math.floor((ds.length * tolPct) / 100))]
  set.letters[l] = t
}

let correct = 0, total = 0, confPass = 0, confTotal = 0, top1 = 0
const matrix: Record<string, Record<string, number>> = {}
const perLetter: string[] = []
for (const l of STATIC) {
  matrix[l] = {}
  let lc = 0
  for (const f of test[l]) {
    const c = classify(f, l, set)
    total++
    if (c.pass) { correct++; lc++ }
    if (c.best.letter === l) top1++
    matrix[l][c.best.letter] = (matrix[l][c.best.letter] ?? 0) + 1
    for (const target of CONFUSABLE[l] ?? []) {
      confTotal++
      if (classify(f, target, set).pass) confPass++
    }
  }
  perLetter.push(`${l}: ${lc}/${test[l].length} train=${train[l].length}`)
}
console.log(perLetter.join('  '))
console.log(`\nTest samples: ${total}  (aspect ${aspect}, tolerance p${tolPct}, margin ${margin})`)
console.log(`Top-1 accuracy:            ${((100 * top1) / total).toFixed(1)}%`)
console.log(`Correct signs passed:      ${((100 * correct) / total).toFixed(1)}%   (target >= 90%)`)
console.log(`Confusable wrongly passed: ${((100 * confPass) / confTotal).toFixed(1)}%   (target <= 10%)`)
console.log('\nConfusion (rows = true, cols = nearest letter; off-diagonal only):')
for (const l of STATIC) {
  const off = Object.entries(matrix[l]).filter(([k]) => k !== l).sort((a, b) => b[1] - a[1]).slice(0, 4)
  if (off.length) console.log(`${l} -> ${off.map(([k, v]) => `${k}:${v}`).join(' ')}`)
}

const exportPath = args.indexOf('--export') >= 0 ? args[args.indexOf('--export') + 1] : null
if (exportPath) {
  // Final templates use every thinned sample (train + test) from the dataset.
  const final: TemplateSet = { schemaVersion: TEMPLATE_SCHEMA_VERSION, featureVersion: FEATURE_VERSION, source: 'ASL-Now (MIT)', letters: {}, ghosts: {} }
  const round = (n: number) => Math.round(n * 1e4) / 1e4
  for (const l of STATIC) {
    const all = [...train[l], ...test[l]]
    const t = buildTemplate(l, all, { tolerance: 0, margin })
    const ds = all.map((s) => templateDistance(s, t)).sort((a, b) => a - b)
    t.tolerance = round(ds[Math.min(ds.length - 1, Math.floor((ds.length * tolPct) / 100))])
    t.mean = t.mean.map(round)
    t.spread = t.spread.map(round)
    final.letters[l] = t
    // Ghost shape: the sample closest to the mean, wrist at origin, scaled to palm size.
    const medoid = all.reduce((best, s) => (templateDistance(s, t) < templateDistance(best, t) ? s : best))
    const lm = rawOf.get(medoid)!
    const px = (i: number) => ({ x: lm[i].x * aspect - lm[0].x * aspect, y: lm[i].y - lm[0].y })
    const size = Math.hypot(px(9).x, px(9).y) || 1
    final.ghosts![l] = lm.map((_, i) => [round(px(i).x / size), round(px(i).y / size)] as [number, number])
  }
  mkdirSync(dirname(exportPath), { recursive: true })
  writeFileSync(exportPath, JSON.stringify(final))
  console.log(`
Exported templates for ${STATIC.length} letters to ${exportPath}`)
}
