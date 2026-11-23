import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useState } from 'react'

const BASE = import.meta.env.BASE_URL
const WASM_URL = `${BASE}mediapipe/wasm`
const MODEL_URL = `${BASE}mediapipe/hand_landmarker.task`

interface UseHandLandmarkerResult {
  landmarker: HandLandmarker | null
  loading: boolean
  error: string | null
}

export function useHandLandmarker(): UseHandLandmarkerResult {
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let instance: HandLandmarker | null = null

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const vision = await FilesetResolver.forVisionTasks(WASM_URL)
        const create = (delegate: 'GPU' | 'CPU') =>
          HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          })
        try {
          instance = await create('GPU')
        } catch {
          instance = await create('CPU')
        }
        if (cancelled) {
          instance.close()
          return
        }
        setLandmarker(instance)
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Failed to load hand tracking model.'
          setError(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (instance) instance.close()
    }
  }, [])

  return { landmarker, loading, error }
}
