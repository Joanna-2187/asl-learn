import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import templatesJson from '../data/templates/aslnow.json'
import type { TemplateSet } from '../data/templates/schema.ts'
import { HAND_CONNECTIONS } from '../lib/geometry.ts'
import type { Settings } from '../lib/settings.ts'
import type { LetterTarget, Point3D, ScoreResult } from '../lib/types.ts'
import { scoreWithFeatures } from '../scoring/featureScore.ts'
import { useHandLandmarker } from './useHandLandmarker.ts'

const TEMPLATES = templatesJson as unknown as TemplateSet

export const NO_HAND: ScoreResult = {
  handDetected: false,
  handshape: { ok: false, message: 'No hand detected yet.' },
  pass: false,
}

const MOTION_NOTE: ScoreResult = {
  handDetected: true,
  handshape: { ok: true, message: '' },
  pass: false,
}

type Ghost = [number, number][]

function drawOverlay(canvas: HTMLCanvasElement, video: HTMLVideoElement, landmarks: Point3D[] | null, ghost?: Ghost) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const width = video.videoWidth || 640
  const height = video.videoHeight || 480
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height

  ctx.save()
  ctx.clearRect(0, 0, width, height)
  // Mirror to match the mirrored video.
  ctx.translate(width, 0)
  ctx.scale(-1, 1)

  if (landmarks && landmarks.length >= 21) {
    if (ghost && ghost.length >= 21) drawGhost(ctx, landmarks, ghost, width, height)

    ctx.lineWidth = 3
    ctx.strokeStyle = '#22d3ee'
    ctx.fillStyle = '#34d399'
    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = landmarks[a]
      const pb = landmarks[b]
      if (!pa || !pb) continue
      ctx.beginPath()
      ctx.moveTo(pa.x * width, pa.y * height)
      ctx.lineTo(pb.x * width, pb.y * height)
      ctx.stroke()
    }
    for (const pt of landmarks) {
      ctx.beginPath()
      ctx.arc(pt.x * width, pt.y * height, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

/** Target skeleton pinned to the user's wrist and scaled to their palm size. */
function drawGhost(ctx: CanvasRenderingContext2D, user: Point3D[], ghost: Ghost, width: number, height: number) {
  const aspect = width / height
  const size = Math.hypot((user[9].x - user[0].x) * aspect, user[9].y - user[0].y)
  if (size < 1e-4) return
  // Flip the ghost if it faces the other way (thumb on the opposite side) so left and right hands both line up.
  const flip = Math.sign(user[5].x - user[17].x) !== Math.sign(ghost[5][0] - ghost[17][0]) ? -1 : 1
  const pts = ghost.map(([gx, gy]) => ({
    x: (user[0].x + (flip * gx * size) / aspect) * width,
    y: (user[0].y + gy * size) * height,
  }))
  ctx.save()
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)'
  ctx.fillStyle = 'rgba(253, 224, 71, 0.85)'
  ctx.setLineDash([8, 6])
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath()
    ctx.moveTo(pts[a].x, pts[a].y)
    ctx.lineTo(pts[b].x, pts[b].y)
    ctx.stroke()
  }
  ctx.setLineDash([])
  for (const p of pts) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function scoreKey(s: ScoreResult): string {
  return [s.handDetected, s.pass, s.handshape.ok, s.handshape.message, s.lookalike?.ok, s.lookalike?.message].join('|')
}

export interface CameraScoring {
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  /** Latest score (updates every frame; read it from event handlers). */
  scoreRef: RefObject<ScoreResult>
  /** Score for rendering (updates only when what the user sees changes). */
  score: ScoreResult
  cameraReady: boolean
  cameraError: string | null
  modelLoading: boolean
  modelError: string | null
  fps: number
}

export function useCameraScoring(target: LetterTarget, settings: Settings): CameraScoring {
  const [score, setScore] = useState<ScoreResult>(NO_HAND)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [fps, setFps] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const scoreRef = useRef<ScoreResult>(NO_HAND)
  const keyRef = useRef('')
  const rafRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastVideoTimeRef = useRef(-1)
  const frameCount = useRef({ n: 0, since: 0 })

  const { landmarker, loading: modelLoading, error: modelError } = useHandLandmarker()

  useEffect(() => {
    let cancelled = false
    async function startCamera() {
      try {
        setCameraError(null)
        setCameraReady(false)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop()
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
          if (!cancelled) setCameraReady(true)
        }
      } catch (e) {
        if (!cancelled) setCameraError(e instanceof Error ? e.message : 'Unable to access the camera.')
      }
    }
    void startCamera()
    return () => {
      cancelled = true
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop()
        streamRef.current = null
      }
    }
  }, [])

  const { leftHand, ghost: ghostOn } = settings
  useEffect(() => {
    const ghost = ghostOn ? TEMPLATES.ghosts?.[target.letter] : undefined

    function publish(next: ScoreResult) {
      scoreRef.current = next
      const key = scoreKey(next)
      if (key !== keyRef.current) {
        keyRef.current = key
        setScore(next)
      }
    }

    function loop() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas) {
        if (landmarker && cameraReady && video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime
          try {
            const result = landmarker.detectForVideo(video, performance.now())
            const lm = (result.landmarks?.[0] as Point3D[] | undefined) ?? null
            const world = (result.worldLandmarks?.[0] as Point3D[] | undefined) ?? null
            drawOverlay(canvas, video, lm, ghost)

            const fc = frameCount.current
            fc.n += 1
            const now = performance.now()
            if (now - fc.since >= 1000) {
              setFps(Math.round((fc.n * 1000) / (now - fc.since)))
              fc.n = 0
              fc.since = now
            }

            const points = world ?? lm
            if (!points) publish(NO_HAND)
            else if (target.motion) publish(MOTION_NOTE)
            else publish(scoreWithFeatures(points, target, TEMPLATES, { leftHand }))
          } catch {
            // Ignore transient detection errors (e.g. during teardown).
          }
        } else if (video.readyState >= 2) {
          drawOverlay(canvas, video, null)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [landmarker, cameraReady, target, leftHand, ghostOn])

  return { videoRef, canvasRef, scoreRef, score, cameraReady, cameraError, modelLoading, modelError, fps }
}
