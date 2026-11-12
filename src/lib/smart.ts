// Auswahl für Wiederholungen und „Schlau lernen“. Reine Funktionen → smart.test.ts.

import { cardKey, nextTile, tileQuestions, tileStatus } from './model.ts'
import type { QuestionRef } from './session.ts'
import { isAtRisk, retrievability } from './srs.ts'
import type { CardState, Course, LearnState, Tile } from './types.ts'

export interface CardRef extends QuestionRef {
  key: string
  card: CardState
}

/** Alle Fragen gelernter Kacheln, die einen Gedächtnis-Stand haben */
export function learnedCards(courses: Course[], learn: LearnState, courseId?: string): CardRef[] {
  const refs: CardRef[] = []
  for (const course of courses) {
    if (courseId && course.id !== courseId) continue
    for (const tile of course.tiles) {
      if (tileStatus(learn, course.id, tile.id) !== 'done') continue
      for (const { step, index } of tileQuestions(tile)) {
        const key = cardKey(course.id, tile.id, step)
        const card = learn.cards[key]
        if (card) refs.push({ courseId: course.id, tileId: tile.id, step: index, key, card })
      }
    }
  }
  return refs
}

export function atRiskCards(courses: Course[], learn: LearnState, now: number, courseId?: string): CardRef[] {
  return learnedCards(courses, learn, courseId).filter((ref) => isAtRisk(ref.card, now))
}

/**
 * Fragen für eine Runde „Wissen stärken“: die am stärksten gefährdeten zuerst.
 * Gibt es nichts Fälliges, kommen trotzdem die schwächsten dran – man darf
 * beliebig oft stärken.
 */
export function pickForReview(
  courses: Course[],
  learn: LearnState,
  now: number,
  limit: number,
  courseId?: string,
  random: () => number = Math.random,
): CardRef[] {
  const chosen = learnedCards(courses, learn, courseId)
    .map((ref) => ({ ref, r: retrievability(ref.card, now) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map(({ ref }) => ref)
  // Reihenfolge mischen, damit nicht immer derselbe Kurs am Stück kommt
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[chosen[i], chosen[j]] = [chosen[j], chosen[i]]
  }
  return chosen
}

export type SmartPlan =
  | { kind: 'review'; reason: 'due' | 'strengthen'; refs: CardRef[] }
  | { kind: 'tile'; reason: 'continue' | 'next'; course: Course; tile: Tile }
  | { kind: 'empty' }

/**
 * Was „Schlau lernen“ startet:
 * 1. gefährdete Fragen wiederholen
 * 2. eine angefangene Kachel fortsetzen
 * 3. die nächste neue Kachel (zuerst im zuletzt gelernten Kurs)
 * 4. sonst die schwächsten Fragen stärken
 */
export function planSmartSession(
  courses: Course[],
  learn: LearnState,
  now: number,
  limit: number,
  random: () => number = Math.random,
): SmartPlan {
  const due = atRiskCards(courses, learn, now)
  if (due.length > 0) {
    const refs = pickForReview(courses, learn, now, limit, undefined, random)
    return { kind: 'review', reason: 'due', refs }
  }

  // Angefangene Kachel – die zuletzt begonnene zuerst
  let started: { course: Course; tile: Tile; at: number } | undefined
  for (const course of courses) {
    for (const tile of course.tiles) {
      const state = learn.tiles[course.id]?.[tile.id]
      if (state?.status === 'learning' && (!started || state.startedAt > started.at)) {
        started = { course, tile, at: state.startedAt }
      }
    }
  }
  if (started) return { kind: 'tile', reason: 'continue', course: started.course, tile: started.tile }

  const ordered = [
    ...courses.filter((c) => c.id === learn.lastCourseId),
    ...courses.filter((c) => c.id !== learn.lastCourseId),
  ]
  for (const course of ordered) {
    const tile = nextTile(course, learn)
    if (tile) return { kind: 'tile', reason: 'next', course, tile }
  }

  const refs = pickForReview(courses, learn, now, limit, undefined, random)
  if (refs.length > 0) return { kind: 'review', reason: 'strengthen', refs }
  return { kind: 'empty' }
}
