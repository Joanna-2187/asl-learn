import { useMemo, useState } from 'react'
import { LETTERS_BY_ID, LETTER_ORDER } from '../data/letters.ts'
import { useCameraScoring } from '../hooks/useCameraScoring.ts'
import { getLetterProgress, getOverallStats, loadProgress, recordAttempt, saveProgress } from '../lib/progress.ts'
import { loadSettings, saveSettings } from '../lib/settings.ts'
import type { Settings } from '../lib/settings.ts'
import type { ProgressMap } from '../lib/types.ts'
import { CameraPanel, DataControls, FeedbackCard, SettingsBar } from './panels.tsx'
import { ReferenceMedia } from './ReferenceMedia.tsx'

export function PracticeView() {
  const [selected, setSelected] = useState<string>('A')
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  const target = LETTERS_BY_ID[selected]
  const cam = useCameraScoring(target, settings)
  const overall = useMemo(() => getOverallStats(progress), [progress])
  const letterProgress = getLetterProgress(progress, selected)

  function updateSettings(next: Settings) {
    setSettings(next)
    saveSettings(next)
  }

  function handleRecord(pass: boolean) {
    setProgress((prev) => recordAttempt(prev, selected, pass))
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">ASL Fingerspelling Practice</h1>
          <p className="mt-1 text-sm text-slate-400">
            Practice all 26 letters with live webcam feedback. J and Z are motion letters: practise them with the reference, self-graded.
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
          Progress: <span className="font-medium text-white">{overall.passed}</span>/{overall.total} letters passed · {overall.practiced} practiced
        </div>
      </header>

      <div className="mb-6">
        <SettingsBar settings={settings} onChange={updateSettings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4">
          <CameraPanel cam={cam} />
          <div>
            <FeedbackCard target={target} score={cam.score} />
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleRecord(true)}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Mark pass
                </button>
                <button
                  type="button"
                  onClick={() => handleRecord(false)}
                  className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600"
                >
                  Mark try again
                </button>
                <span className="self-center text-xs text-slate-400">Live scoring updates continuously; use buttons to record your attempt.</span>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Attempts: {letterProgress.attempts} · Passes: {letterProgress.passes} · Last: {letterProgress.lastResult ?? '—'}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Letter {target.letter}</h2>
              <span className="text-sm text-slate-400">{target.motion ? 'Motion letter' : 'Static fingerspelling'}</span>
            </div>
            <ReferenceMedia letter={target.letter} />
            <p className="mt-3 text-sm text-slate-200">{target.description}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="mb-1 font-medium text-slate-100">Handshape tip</div>
                <div>{target.handshapeTip}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="mb-1 font-medium text-slate-100">Palm tip</div>
                <div>{target.palmTip}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Letters</h2>
              <span className="text-xs text-slate-400">J and Z: self-graded</span>
            </div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {LETTER_ORDER.map((letter) => {
                const p = getLetterProgress(progress, letter)
                const active = letter === selected
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setSelected(letter)}
                    className={`relative rounded-md border px-0 py-2 text-sm font-semibold transition ${
                      active ? 'border-cyan-400 bg-cyan-500/20 text-white' : 'border-slate-700 bg-slate-950/40 text-slate-200 hover:border-slate-500'
                    }`}
                    title={`${letter}: ${p.attempts} attempts, ${p.passes} passes`}
                  >
                    {letter}
                    <span
                      className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                        p.passes > 0 ? 'bg-emerald-400' : p.attempts > 0 ? 'bg-amber-400' : 'bg-slate-700'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Passed</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Practiced</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-700" /> Not tried</span>
            </div>
          </div>

          <DataControls
            progress={progress}
            onImport={(p) => {
              saveProgress(p)
              setProgress(p)
            }}
          />
        </section>
      </div>
    </div>
  )
}
