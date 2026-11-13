// Ablauf einer Lernsitzung (Kachel lernen, nur lesen oder wiederholen).
// Falsch beantwortete Fragen werden hinten angehängt und kommen so lange
// wieder, bis sie richtig beantwortet sind. Reine Funktionen → session.test.ts.

import { cardKey } from './model.ts'
import { isQuestion, type Course, type QuestionStep, type Tile } from './types.ts'

interface Base {
  courseId: string
  tileId: string
}

export type SessionItem =
  | (Base & { kind: 'intro' })
  | (Base & { kind: 'page'; step: number })
  | (Base & { kind: 'question'; step: number; retry: boolean })
  | (Base & { kind: 'recap' })

export type TileMode = 'learn' | 'read'

/** Schritte einer Kachel: Einleitung, Seiten und Fragen in Reihenfolge, Rückblick */
export function tileItems(courseId: string, tile: Tile, mode: TileMode): SessionItem[] {
  const base = { courseId, tileId: tile.id }
  const items: SessionItem[] = []
  if (tile.intro?.length) items.push({ ...base, kind: 'intro' })
  tile.steps.forEach((step, index) => {
    if (!isQuestion(step)) items.push({ ...base, kind: 'page', step: index })
    else if (mode === 'learn') items.push({ ...base, kind: 'question', step: index, retry: false })
  })
  if (tile.recap?.length) items.push({ ...base, kind: 'recap' })
  return items
}

export interface QuestionRef extends Base {
  step: number
}

export function reviewItems(refs: QuestionRef[]): SessionItem[] {
  return refs.map((ref) => ({ ...ref, kind: 'question', retry: false }))
}

export interface SessionState {
  items: SessionItem[]
  index: number
  /** Ergebnis beim ersten Versuch je Frage (Schlüssel siehe cardKey) */
  firstTry: Record<string, boolean>
}

export function startSession(items: SessionItem[]): SessionState {
  return { items, index: 0, firstTry: {} }
}

/**
 * Antwort auf die aktuelle Frage einrechnen; falsch → hinten erneut anhängen.
 * In einer Prüfung (`retry` = false) kommt jede Frage genau einmal.
 */
export function answer(state: SessionState, key: string, correct: boolean, retry = true): SessionState {
  const item = state.items[state.index]
  if (!item || item.kind !== 'question') return state
  const firstTry = key in state.firstTry ? state.firstTry : { ...state.firstTry, [key]: correct }
  const items = correct || !retry ? state.items : [...state.items, { ...item, retry: true }]
  return { ...state, items, firstTry }
}

export function advance(state: SessionState): SessionState {
  return { ...state, index: Math.min(state.items.length, state.index + 1) }
}

export function isFinished(state: SessionState): boolean {
  return state.index >= state.items.length
}

/** Noch offene Wiederholungen (angehängt, aber noch nicht dran gewesen) */
export function pendingRetries(state: SessionState): number {
  return state.items.slice(state.index + 1).filter((item) => item.kind === 'question' && item.retry).length
}

export function firstTryStats(state: SessionState) {
  const values = Object.values(state.firstTry)
  return { correct: values.filter(Boolean).length, total: values.length }
}

/** Frage zu einem Sitzungsschritt nachschlagen */
export function lookupQuestion(
  courses: Course[],
  ref: Base & { step: number },
): { course: Course; tile: Tile; step: QuestionStep; key: string } | null {
  const course = courses.find((c) => c.id === ref.courseId)
  const tile = course?.tiles.find((t) => t.id === ref.tileId)
  const step = tile?.steps[ref.step]
  if (!course || !tile || !step || !isQuestion(step)) return null
  return { course, tile, step, key: cardKey(course.id, tile.id, step) }
}
