// Copies the pinned MediaPipe WASM runtime into public/mediapipe/wasm and
// downloads the hand landmarker model once, so the app serves both itself.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'

const OUT = 'public/mediapipe'
const MODEL = `${OUT}/hand_landmarker.task`
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

mkdirSync(`${OUT}/wasm`, { recursive: true })
cpSync('node_modules/@mediapipe/tasks-vision/wasm', `${OUT}/wasm`, { recursive: true })

if (!existsSync(MODEL)) {
  try {
    const res = await fetch(MODEL_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    writeFileSync(MODEL, Buffer.from(await res.arrayBuffer()))
    console.log('Downloaded hand_landmarker.task')
  } catch (e) {
    console.warn(`Could not download the model (${e.message}). Re-run: npm run setup:mediapipe`)
  }
}
