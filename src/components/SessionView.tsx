import { useMemo, useRef, useState } from 'react'
import { LETTERS_BY_ID } from '../data/letters.ts'
import { useCameraScoring } from '../hooks/useCameraScoring.ts'
import { CONFUSABLE_GROUPS } from '../scoring/classify.ts'
import { loadProgress, recordAttempt } from '../lib/progress.ts'
import { loadSettings, saveSettings } from '../lib/settings.ts'
import type { Settings } from '../lib/settings.ts'
import { REVIEW_SESSION_CAP, buildReviewQueue, gradeFromResult, reviewCard } from '../lib/srs.ts'
import type { ReviewGrade } from '../lib/srs.ts'
import type { ProgressMap } from '../lib/types.ts'
import { CameraPanel, FeedbackCard, SettingsBar } from './panels.tsx'
import { ReferenceMedia } from './ReferenceMedia.tsx'

type Kind = 'review' | 'drill'
const DRILL_LENGTH = 10
const GRADE_LABEL: Record<ReviewGrade, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' }

interface Outcome {
  letter: string
  pass: boolean
  grade?: ReviewGrade
  message: string
}

function pickDrill(letters: string[]): string[] {
  const out: string[] = []
  while (out.length < DRILL_LENGTH) {
    const next = letters[Math.floor(Math.random() * letters.length)]
    if (next !== out[out.length - 1] || letters.length === 1) out.push(next)
  }
  return out
}

export function SessionView({ kind }: { kind: Kind }) {
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [queue, setQueue] = useState<string[] | null>(null)
  const [index, setIndex] = useState(0)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])
  const [current, setCurrent] = useState<Outcome | null>(null)
  const [showRef, setShowRef] = useState(kind === 'drill')
  const [notice, setNotice] = useState<string | null>(null)
  const shownAt = useRef(0)

  const letter = queue?.[index] ?? 'A'
  const target = LETTERS_BY_ID[letter]
  const cam = useCameraScoring(target, settings)
  const dueCount = useMemo(() => buildReviewQueue(progress).length, [progress])
  const done = queue !== null && index >= queue.length

  function updateSettings(next: Settings) {
    setSettings(next)
    saveSettings(next)
  }

  function start(letters: string[]) {
    setQueue(letters)
    setIndex(0)
    setOutcomes([])
    setCurrent(null)
    setShowRef(kind === 'drill')
    setNotice(null)
    shownAt.current = Date.now()
  }

  function submit(selfPass?: boolean) {
    const s = cam.scoreRef.current
    if (!target.motion && !s.handDetected) {
      setNotice('Show your hand to the camera first.')
      return
    }
    setNotice(null)
    const pass = target.motion ? selfPass === true : s.pass
    const seconds = (Date.now() - shownAt.current) / 1000
    let outcome: Outcome
    if (kind === 'review') {
      const grade = gradeFromResult(pass, target.motion ? undefined : s.margin, seconds)
      const card = reviewCard(progress[letter]?.card ?? null, grade)
      setProgress((prev) => recordAttempt(prev, letter, pass, card))
      outcome = { letter, pass, grade, message: pass ? 'Nice.' : s.handshape.message || 'Not quite.' }
    } else {
      setProgress((prev) => recordAttempt(prev, letter, pass))
      outcome = { letter, pass, message: pass ? 'Correct.' : s.lookalike?.message || s.handshape.message || 'Not quite.' }
    }
    setCurrent(outcome)
    setOutcomes((o) => [...o, outcome])
  }

  function next() {
    setCurrent(null)
    setShowRef(kind === 'drill')
    setIndex((i) => i + 1)
    shownAt.current = Date.now()
  }

  const title = kind === 'review' ? 'Review' : 'Look-alike drill'

  if (queue === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
        {kind === 'review' ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-slate-300">
            <p className="mb-4 text-sm">
              Letters that are due come first, then letters you haven’t reviewed yet, up to {REVIEW_SESSION_CAP} per session. Sign each letter
              from memory (the reference is hidden until you ask for it), then press “Check my sign”.
            </p>
            <p className="mb-4 text-sm text-slate-400">{dueCount} letters in this session.</p>
            <button
              type="button"
              disabled={dueCount === 0}
              onClick={() => start(buildReviewQueue(progress))}
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-40"
            >
              {dueCount === 0 ? 'Nothing due right now' : 'Start review'}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-slate-300">
            <p className="mb-4 text-sm">
              Pick a group of look-alike letters. You’ll get {DRILL_LENGTH} prompts mixed from the group, and feedback says which letter you drifted
              toward.
            </p>
            <div className="flex flex-wrap gap-2">
              {CONFUSABLE_GROUPS.map((g) => (
                <button
                  key={g.join('')}
                  type="button"
                  onClick={() => start(pickDrill(g))}
                  className="rounded-md border border-slate-600 bg-slate-950/40 px-4 py-2 text-sm font-medium text-slate-100 hover:border-cyan-400"
                >
                  {g.join(' / ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (done) {
    const correct = outcomes.filter((o) => o.pass).length
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{title} complete</h1>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-slate-300">
          <p className="mb-3 text-lg text-white">
            {correct} of {outcomes.length} correct
          </p>
          <ul className="mb-4 flex flex-wrap gap-2 text-sm">
            {outcomes.map((o, i) => (
              <li key={i} className={`rounded-md px-2.5 py-1 ${o.pass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'}`}>
                {o.letter}
                {o.grade ? ` · ${GRADE_LABEL[o.grade]}` : ''}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setQueue(null)} className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
          Card {index + 1} of {queue.length}
        </div>
      </header>
      <div className="mb-6">
        <SettingsBar settings={settings} onChange={updateSettings} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4">
          <CameraPanel cam={cam} />
          <FeedbackCard target={target} score={cam.score} />
        </section>
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-1 text-center text-6xl font-semibold text-white">{letter}</h2>
            <p className="mb-3 text-center text-sm text-slate-400">{target.motion ? 'Motion letter: self-graded' : 'Sign this letter'}</p>
            {showRef || current ? (
              <>
                <ReferenceMedia letter={letter} />
                <p className="mt-3 text-sm text-slate-200">{target.description}</p>
              </>
            ) : (
              <button type="button" onClick={() => setShowRef(true)} className="w-full rounded-md border border-dashed border-slate-600 py-3 text-sm text-slate-300 hover:border-slate-400">
                Show reference
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            {current ? (
              <div>
                <p className={`mb-1 text-lg font-semibold ${current.pass ? 'text-emerald-300' : 'text-amber-200'}`}>
                  {current.pass ? 'Correct' : 'Not yet'}
                  {current.grade ? ` · rated ${GRADE_LABEL[current.grade]}` : ''}
                </p>
                <p className="mb-3 text-sm text-slate-300">{current.message}</p>
                <button type="button" onClick={next} className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">
                  {index + 1 >= queue.length ? 'Finish' : 'Next letter'}
                </button>
              </div>
            ) : target.motion ? (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => submit(true)} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                  I got it
                </button>
                <button type="button" onClick={() => submit(false)} className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600">
                  Missed it
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => submit()} className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">
                  Check my sign
                </button>
                {notice && <span className="text-sm text-amber-200" role="status">{notice}</span>}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
