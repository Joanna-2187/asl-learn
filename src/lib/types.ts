export interface Point3D {
  x: number
  y: number
  z: number
}

export type LandmarkList = Point3D[]

export interface LetterTarget {
  letter: string
  label: string
  description: string
  handshapeTip: string
  palmTip: string
  referenceImage?: string
  referenceVideo?: string
  /** Motion letters (J, Z) are practised with the reference only; no automatic scoring yet. */
  motion?: boolean
}

export interface ParameterFeedback {
  ok: boolean
  message: string
}

export interface ScoreResult {
  handDetected: boolean
  handshape: ParameterFeedback
  pass: boolean
  /** How well the sign is told apart from look-alike letters. */
  lookalike?: ParameterFeedback
  /** Gap between the nearest look-alike and the target (higher is clearer). */
  margin?: number
}

export interface AttemptRecord {
  t: string
  pass: boolean
}

/** Serialized ts-fsrs card (dates as ISO strings so it survives JSON). */
export interface StoredCard {
  due: string
  stability: number
  difficulty: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review: string | null
}

export interface LetterProgress {
  attempts: number
  passes: number
  lastResult: 'pass' | 'try-again' | null
  lastPracticedAt: string | null
  /** Most recent attempts, capped (see MAX_RECENT_ATTEMPTS). */
  recent: AttemptRecord[]
  card: StoredCard | null
}

export type ProgressMap = Record<string, LetterProgress>
