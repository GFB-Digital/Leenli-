// Auswahl für Wiederholungen, Prüfungen und „Schlau lernen“. Reine Funktionen → learning.test.ts.

import { cardKey, nextTile, tileQuestions, tileStatus } from './model.ts'
import type { QuestionRef } from './session.ts'
import { DAY, SRS, isAtRisk, retrievability } from './srs.ts'
import type { CardState, Course, LearnState, Tile } from './types.ts'

export interface CardRef extends QuestionRef {
  key: string
  card: CardState
}

/**
 * Alle Fragen gelernter Kacheln mit ihrem Gedächtnis-Stand. Hat eine Frage noch
 * keinen (sie kam nach dem Lernen neu in die Kachel oder ihr Text wurde
 * geändert), gilt sie als sofort fällig – so geht sie nicht verloren.
 */
export function learnedCards(courses: Course[], learn: LearnState, courseId?: string): CardRef[] {
  const refs: CardRef[] = []
  for (const course of courses) {
    if (courseId && course.id !== courseId) continue
    for (const tile of course.tiles) {
      if (tileStatus(learn, course.id, tile.id) !== 'done') continue
      const learnedAt = learn.tiles[course.id]?.[tile.id]?.completedAt ?? 0
      for (const { step, index } of tileQuestions(tile)) {
        const key = cardKey(course.id, tile.id, step)
        const card = learn.cards[key] ?? {
          s: SRS.minStability,
          ease: SRS.startEase,
          last: learnedAt,
          due: learnedAt,
          reps: 0,
          lapses: 0,
        }
        refs.push({ courseId: course.id, tileId: tile.id, step: index, key, card })
      }
    }
  }
  return refs
}

export function atRiskCards(courses: Course[], learn: LearnState, now: number, courseId?: string): CardRef[] {
  return learnedCards(courses, learn, courseId).filter((ref) => isAtRisk(ref.card, now))
}

// ---------------------------------------------------------------------------
// Prüfungstermine

export const EXAM = {
  /** In den letzten Tagen vor der Prüfung soll jede Frage noch einmal drankommen */
  window: 7,
  /** So viele Tage vor der Prüfung sollen alle Kacheln gelernt sein */
  reserve: 3,
  /** Fragen in einer Prüfung */
  size: 20,
} as const

/** Mitternacht (Ortszeit) eines Tages „JJJJ-MM-TT“, oder null bei ungültiger Angabe */
function dayStart(date: string | undefined): number | null {
  const match = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const time = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()
  return Number.isNaN(time) ? null : time
}

/** Ganze Tage bis zur Prüfung (0 = heute, negativ = vorbei), oder null ohne Termin */
export function daysUntilExam(date: string | undefined, now: number): number | null {
  const exam = dayStart(date)
  if (exam === null) return null
  const today = new Date(now)
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return Math.round((exam - midnight) / DAY)
}

/** In der Woche vor der Prüfung: Frage wurde seit Beginn dieser Woche noch nicht wiederholt */
function dueForExam(ref: CardRef, learn: LearnState, now: number): boolean {
  const date = learn.examDates?.[ref.courseId]
  const days = daysUntilExam(date, now)
  if (days === null || days < 0 || days > EXAM.window) return false
  return ref.card.last < dayStart(date)! - EXAM.window * DAY
}

/** Fragen, die jetzt wiederholt werden sollten: gefährdet oder vor einer Prüfung noch offen */
export function dueCards(courses: Course[], learn: LearnState, now: number, courseId?: string): CardRef[] {
  return learnedCards(courses, learn, courseId).filter((ref) => isAtRisk(ref.card, now) || dueForExam(ref, learn, now))
}

export interface ExamPlan {
  /** Tage bis zur Prüfung (0 = heute, negativ = vorbei) */
  days: number
  /** noch nicht gelernte Kacheln */
  remaining: number
  /** so viele neue Kacheln pro Tag, damit vor der Prüfung noch Zeit zum Wiederholen bleibt */
  perDay: number
}

export function examPlan(course: Course, learn: LearnState, now: number): ExamPlan | null {
  const days = daysUntilExam(learn.examDates?.[course.id], now)
  if (days === null) return null
  const remaining = course.tiles.filter((tile) => tileStatus(learn, course.id, tile.id) !== 'done').length
  const perDay = remaining > 0 && days >= 0 ? Math.ceil(remaining / Math.max(1, days - EXAM.reserve)) : 0
  return { days, remaining, perDay }
}

/** „Prüfung in 12 Tagen · noch 9 Kacheln, am besten 1 pro Tag“ */
export function examPlanText(plan: ExamPlan): string {
  if (plan.days < 0) return 'Der Prüfungstermin ist vorbei.'
  const when = plan.days === 0 ? 'Prüfung heute' : plan.days === 1 ? 'Prüfung morgen' : `Prüfung in ${plan.days} Tagen`
  if (plan.remaining === 0) {
    return plan.days === 0 ? `${when} – viel Erfolg!` : `${when} · alles gelernt, jetzt täglich „Wissen stärken“`
  }
  const tiles = plan.remaining === 1 ? 'noch 1 Kachel' : `noch ${plan.remaining} Kacheln`
  return plan.days === 0 ? `${when} · ${tiles} offen` : `${when} · ${tiles}, am besten ${plan.perDay} pro Tag`
}

/**
 * Fragen für eine Prüfung: reihum aus allen Kacheln des Kurses (jede Kachel
 * kommt dran, bevor eine zweimal drankommt), danach gemischt.
 */
export function pickForExam(course: Course, limit: number, random: () => number = Math.random): QuestionRef[] {
  const shuffle = <T,>(list: T[]) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    return list
  }
  const perTile = shuffle(
    course.tiles.map((tile) =>
      shuffle(tileQuestions(tile).map(({ index }) => ({ courseId: course.id, tileId: tile.id, step: index }))),
    ),
  )
  const chosen: QuestionRef[] = []
  for (let round = 0; chosen.length < limit; round++) {
    const batch = perTile.flatMap((questions) => (questions[round] ? [questions[round]] : []))
    if (batch.length === 0) break
    chosen.push(...batch.slice(0, limit - chosen.length))
  }
  return shuffle(chosen)
}

// ---------------------------------------------------------------------------
// Wiederholen

/**
 * Fragen für eine Runde „Wissen stärken“: zuerst, was vor einer Prüfung noch
 * offen ist, dann die am stärksten gefährdeten. Gibt es nichts Fälliges, kommen
 * trotzdem die schwächsten dran – man darf beliebig oft stärken.
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
    .map((ref) => ({ ref, r: retrievability(ref.card, now), exam: dueForExam(ref, learn, now) }))
    .sort((a, b) => Number(b.exam) - Number(a.exam) || a.r - b.r)
    .slice(0, limit)
    .map(({ ref }) => ref)
  // Reihenfolge mischen, damit nicht immer derselbe Kurs am Stück kommt
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[chosen[i], chosen[j]] = [chosen[j], chosen[i]]
  }
  return chosen
}

/** Fragen, die schon mehrfach falsch waren – die häufigsten Fehler zuerst */
export function hardCards(courses: Course[], learn: LearnState, courseId?: string, minLapses = 2): CardRef[] {
  return learnedCards(courses, learn, courseId)
    .filter((ref) => ref.card.lapses >= minLapses)
    .sort((a, b) => b.card.lapses - a.card.lapses || a.card.s - b.card.s)
}

/** Wie viele Wiederholungen anstehen: bis heute Abend, morgen, in den nächsten 7 Tagen (einschließlich heute) */
export function dueForecast(courses: Course[], learn: LearnState, now: number) {
  const today = new Date(now)
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime()
  const dues = learnedCards(courses, learn).map((ref) => ref.card.due)
  return {
    today: dues.filter((due) => due < endOfToday).length,
    tomorrow: dues.filter((due) => due >= endOfToday && due < endOfToday + DAY).length,
    week: dues.filter((due) => due < endOfToday + 6 * DAY).length,
  }
}

// ---------------------------------------------------------------------------
// „Schlau lernen“

export type SmartPlan =
  | { kind: 'review'; reason: 'due' | 'strengthen'; refs: CardRef[] }
  | { kind: 'tile'; reason: 'continue' | 'next'; course: Course; tile: Tile }
  | { kind: 'empty' }

/**
 * Was „Schlau lernen“ startet:
 * 1. fällige Fragen wiederholen (gefährdet oder vor einer Prüfung noch offen)
 * 2. eine angefangene Kachel fortsetzen
 * 3. die nächste neue Kachel – zuerst im Kurs mit der nächsten Prüfung, sonst im zuletzt gelernten
 * 4. sonst die schwächsten Fragen stärken
 */
export function planSmartSession(
  courses: Course[],
  learn: LearnState,
  now: number,
  limit: number,
  random: () => number = Math.random,
): SmartPlan {
  const due = dueCards(courses, learn, now)
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

  // Kurse mit bevorstehender Prüfung zuerst (die nächste zuerst), dann der zuletzt gelernte
  const examIn = (course: Course) => {
    const days = daysUntilExam(learn.examDates?.[course.id], now)
    return days !== null && days >= 0 ? days : Infinity
  }
  const ordered = courses
    .map((course, index) => ({ course, index, exam: examIn(course), last: course.id === learn.lastCourseId }))
    .sort((a, b) => (a.exam === b.exam ? 0 : a.exam < b.exam ? -1 : 1) || Number(b.last) - Number(a.last) || a.index - b.index)
  for (const { course } of ordered) {
    const tile = nextTile(course, learn)
    if (tile) return { kind: 'tile', reason: 'next', course, tile }
  }

  const refs = pickForReview(courses, learn, now, limit, undefined, random)
  if (refs.length > 0) return { kind: 'review', reason: 'strengthen', refs }
  return { kind: 'empty' }
}
