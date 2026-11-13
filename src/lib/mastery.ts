// Beherrschung einer Kachel: Wie fest sitzt, was man in ihr gelernt hat?
//
// Grundlage ist der Gedächtnis-Stand der Fragen (srs.ts). Es gibt bewusst kein
// zweites Bewertungssystem: Der Wert einer Frage ist ihre Stelle auf der Skala
// der Gedächtnis-Prognose („Gefahr … 5 Jahre+“), gerechnet direkt nach der
// letzten Wiederholung. Er wächst also mit jeder richtigen Wiederholung und
// sinkt nur nach Fehlern – nicht von selbst mit der Zeit. Ob gerade eine
// Wiederholung ansteht, ist eine eigene Angabe (`due`).
// Reine Funktionen → mastery.test.ts.

import { cardKey, tileQuestions, tileStatus } from './model.ts'
import { SRS, daysUntilForgetting, isAtRisk, prognosisPosition } from './srs.ts'
import type { CardState, Course, LearnState, Tile } from './types.ts'

/** Wie fest eine Frage sitzt (0–1) */
export function cardStrength(card: Pick<CardState, 's' | 'last'>): number {
  return prognosisPosition(daysUntilForgetting(card as CardState, card.last))
}

/** Kacheln ohne Fragen lassen sich nicht prüfen – sie zählen wie frisch gelernt */
const UNTESTED = cardStrength({ s: SRS.firstCorrect, last: 0 })

export interface TileMastery {
  status: 'new' | 'learning' | 'done'
  /** 0 = noch nicht gelernt, 1 = sitzt auf Jahre */
  mastery: number
  /** mindestens eine Frage droht vergessen zu werden */
  due: boolean
}

export function tileMastery(course: Pick<Course, 'id'>, tile: Tile, learn: LearnState, now: number): TileMastery {
  const status = tileStatus(learn, course.id, tile.id)
  if (status !== 'done') return { status, mastery: 0, due: false }
  const cards = tileQuestions(tile)
    .map(({ step }) => learn.cards[cardKey(course.id, tile.id, step)])
    .filter((card): card is CardState => card !== undefined)
  if (cards.length === 0) return { status, mastery: UNTESTED, due: false }
  const mastery = cards.reduce((sum, card) => sum + cardStrength(card), 0) / cards.length
  return { status, mastery, due: cards.some((card) => isAtRisk(card, now)) }
}

export type MasteryLevel = 'new' | 'learning' | 'fresh' | 'solid' | 'secure'

/** Ab hier gilt eine Kachel als gefestigt bzw. langfristig sicher */
export const LEVELS = { solid: 0.3, secure: 0.7 } as const

export function masteryLevel(state: TileMastery): MasteryLevel {
  if (state.status !== 'done') return state.status
  if (state.mastery >= LEVELS.secure) return 'secure'
  return state.mastery >= LEVELS.solid ? 'solid' : 'fresh'
}

export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  new: 'Neu',
  learning: 'Angefangen',
  fresh: 'Frisch gelernt',
  solid: 'Gefestigt',
  secure: 'Sitzt langfristig',
}

/** Beherrschung eines ganzen Kurses (Mittel über alle Kacheln, ungelernte zählen 0) */
export function courseMastery(course: Course, learn: LearnState, now: number): number {
  if (course.tiles.length === 0) return 0
  return course.tiles.reduce((sum, tile) => sum + tileMastery(course, tile, learn, now).mastery, 0) / course.tiles.length
}
