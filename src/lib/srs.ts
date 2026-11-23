import { Rating, createEmptyCard, fsrs } from 'ts-fsrs'
import type { Card, Grade } from 'ts-fsrs'
import { LETTER_ORDER } from '../data/letters.ts'
import type { ProgressMap, StoredCard } from './types.ts'

export const REVIEW_SESSION_CAP = 15
const scheduler = fsrs()

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy'

const RATINGS: Record<ReviewGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

function toCard(s: StoredCard): Card {
  return { ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined } as Card
}

function fromCard(c: Card): StoredCard {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.toISOString() : null,
  }
}

/** Applies a review result to a letter's card (creating the card on first review). */
export function reviewCard(prev: StoredCard | null, grade: ReviewGrade, now = new Date()): StoredCard {
  const card = prev ? toCard(prev) : createEmptyCard(now)
  return fromCard(scheduler.next(card, now, RATINGS[grade]).card)
}

/**
 * fail = Again; pass with a thin margin or slow = Hard; pass = Good;
 * fast, clear pass = Easy. Margin is undefined for self-graded (unscored) letters.
 */
export function gradeFromResult(pass: boolean, margin: number | undefined, seconds: number): ReviewGrade {
  if (!pass) return 'again'
  if (margin !== undefined && margin < 0.1) return 'hard'
  if (seconds > 20) return 'hard'
  if (margin !== undefined && margin >= 0.5 && seconds <= 5) return 'easy'
  return 'good'
}

/** Due letters first (most overdue first), then letters never reviewed, capped per session. */
export function buildReviewQueue(progress: ProgressMap, now = new Date(), cap = REVIEW_SESSION_CAP): string[] {
  const due: { letter: string; due: number }[] = []
  const fresh: string[] = []
  for (const letter of LETTER_ORDER) {
    const card = progress[letter]?.card
    if (!card) fresh.push(letter)
    else if (new Date(card.due).getTime() <= now.getTime()) due.push({ letter, due: new Date(card.due).getTime() })
  }
  due.sort((a, b) => a.due - b.due)
  return [...due.map((d) => d.letter), ...fresh].slice(0, cap)
}
