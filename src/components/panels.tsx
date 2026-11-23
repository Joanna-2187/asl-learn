import { useRef, useState } from 'react'
import type { CameraScoring } from '../hooks/useCameraScoring.ts'
import { exportProgress, importProgress } from '../lib/progress.ts'
import type { Settings } from '../lib/settings.ts'
import type { LetterTarget, ProgressMap, ScoreResult } from '../lib/types.ts'

export function FeedbackBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'
      }`}
    >
      {ok ? 'OK' : 'Needs work'}: {label}
    </span>
  )
}

export function CameraPanel({ cam }: { cam: CameraScoring }) {
  const { videoRef, canvasRef, cameraReady, cameraError, modelLoading, modelError, fps } = cam
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-white">Webcam</h2>
        <div className="text-xs text-slate-400">Mirrored view · hand-skeleton overlay</div>
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" style={{ transform: 'scaleX(-1)' }} playsInline muted autoPlay />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-sm text-slate-300">Starting camera…</div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 p-6 text-center text-sm text-amber-200">
            Camera unavailable: {cameraError}. Allow camera access in your browser to practice.
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {modelLoading && <span className="text-slate-400">Loading hand tracking model…</span>}
        {modelError && <span className="text-amber-300">Model error: {modelError}</span>}
        {!modelLoading && !modelError && <span className="text-emerald-300">Hand tracking ready</span>}
        {fps > 0 && <span className="text-xs text-slate-500">{fps} fps</span>}
      </div>
    </div>
  )
}

/** Live pass/try-again readout. Motion letters (J, Z) show a note instead of a score. */
export function FeedbackCard({ target, score }: { target: LetterTarget; score: ScoreResult }) {
  if (target.motion) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-lg font-medium text-white">Feedback for {target.letter}</h2>
        <p className="text-sm text-slate-300">
          {target.letter} is a motion letter, so it isn’t scored automatically yet. Watch the animated example, sign it in front of the camera,
          and judge your own attempt.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Feedback for {target.letter}</h2>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${score.pass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'}`}
        >
          {score.pass ? 'Pass' : 'Try again'}
        </span>
      </div>
      <div className="space-y-3">
        <div>
          <div className="mb-1"><FeedbackBadge ok={score.handshape.ok} label="Handshape" /></div>
          <p className="text-sm text-slate-300">{score.handshape.message}</p>
        </div>
        {score.lookalike && (
          <div>
            <div className="mb-1"><FeedbackBadge ok={score.lookalike.ok} label="Not confused with look-alikes" /></div>
            <p className="text-sm text-slate-300">{score.lookalike.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300" title={hint}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-cyan-400" />
      {label}
    </label>
  )
}

export function SettingsBar({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
      <Toggle label="I sign with my left hand" checked={settings.leftHand} onChange={(leftHand) => onChange({ ...settings, leftHand })} />
      <Toggle label="Ghost overlay" checked={settings.ghost} onChange={(ghost) => onChange({ ...settings, ghost })} hint="Draws the target handshape over your hand" />
    </div>
  )
}

export function DataControls({ progress, onImport }: { progress: ProgressMap; onImport: (p: ProgressMap) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  function download() {
    const blob = new Blob([exportProgress(progress)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `asl-learn-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Progress downloaded.')
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    const result = importProgress(await file.text())
    if (!result.ok) {
      setMessage(result.error)
    } else if (window.confirm(`Replace your current progress with the file's ${result.letters} letters?`)) {
      onImport(result.progress)
      setMessage(`Imported ${result.letters} letters.`)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
      <h2 className="mb-2 text-base font-medium text-white">Your data</h2>
      <p className="mb-3 text-xs text-slate-400">Progress lives only in this browser. Download a copy to back it up or move it to another device.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={download} className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600">
          Download progress
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600">
          Restore from file…
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        {message && <span className="text-xs text-slate-400" role="status">{message}</span>}
      </div>
    </div>
  )
}
