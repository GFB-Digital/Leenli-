// Wiederholung in wachsenden Abständen (Spaced Repetition).
//
// Jede Frage hat eine „Stabilität“ S (in Tagen): Nach S Tagen weiß man sie
// noch mit etwa 90 % Wahrscheinlichkeit. Die Erinnerungswahrscheinlichkeit
// sinkt danach weiter (Vergessenskurve, Formel wie beim Verfahren FSRS).
//
// - Richtig beantwortet → S wächst. Wie stark, hängt davon ab, wie viel Zeit
//   seit der letzten Wiederholung vergangen ist: Wer kurz vor dem Vergessen
//   wiederholt, profitiert am meisten (Abstandseffekt). Sofortiges
//   Wiederholen schadet nicht, bringt aber kaum Zuwachs.
// - Falsch beantwortet → S schrumpft deutlich, die Frage kommt bald wieder.
//
// Nur reine Funktionen → getestet in srs.test.ts.

import type { CardState } from './types.ts'

export const DAY = 86_400_000

/** Unterhalb dieser Erinnerungswahrscheinlichkeit gilt eine Frage als „droht vergessen zu werden“ */
export const TARGET_RETENTION = 0.9

const F = 19 / 81
const C = -0.5

export const SRS = {
  /** Start-Stabilität nach der ersten Kachel: auf Anhieb richtig / erst nach Fehlern */
  firstCorrect: 3,
  firstWrong: 1,
  startEase: 2.5,
  minEase: 1.3,
  maxEase: 3,
  /** Wie viel S nach einem Fehler übrig bleibt */
  lapseFactor: 0.3,
  minStability: 0.5,
  maxStability: 3650,
} as const

/** Erinnerungswahrscheinlichkeit (0–1) zum Zeitpunkt `now` */
export function retrievability(card: CardState, now: number): number {
  const days = Math.max(0, now - card.last) / DAY
  return Math.pow(1 + (F * days) / card.s, C)
}

export function isAtRisk(card: CardState, now: number): boolean {
  return retrievability(card, now) < TARGET_RETENTION
}

function schedule(card: Omit<CardState, 'due'>): CardState {
  return { ...card, due: card.last + card.s * DAY }
}

/** Neue Karte nach dem ersten Durcharbeiten einer Kachel */
export function newCard(firstTryCorrect: boolean, now: number): CardState {
  return schedule({
    s: firstTryCorrect ? SRS.firstCorrect : SRS.firstWrong,
    ease: firstTryCorrect ? SRS.startEase : SRS.startEase - 0.2,
    last: now,
    reps: 1,
    lapses: firstTryCorrect ? 0 : 1,
  })
}

/** Ergebnis einer Wiederholung einrechnen */
export function reviewCard(card: CardState, correct: boolean, now: number): CardState {
  const elapsed = Math.max(0, now - card.last) / DAY
  if (correct) {
    // 0 = sofort wiederholt, 1 = genau zur Fälligkeit, bis 2 = deutlich überfällig
    const timing = Math.min(2, elapsed / card.s)
    const s = Math.min(SRS.maxStability, card.s * (1 + (card.ease - 1) * timing))
    return schedule({
      s: Math.max(card.s, s),
      ease: Math.min(SRS.maxEase, card.ease + 0.05),
      last: now,
      reps: card.reps + 1,
      lapses: card.lapses,
    })
  }
  return schedule({
    s: Math.max(SRS.minStability, card.s * SRS.lapseFactor),
    ease: Math.max(SRS.minEase, card.ease - 0.2),
    last: now,
    reps: card.reps + 1,
    lapses: card.lapses + 1,
  })
}

/**
 * Wie viele Tage ab jetzt man die Frage noch mit mindestens 80 % weiß
 * (≤ 0: schon darunter). Grundlage der Gedächtnis-Prognose.
 */
export function daysUntilForgetting(card: CardState, now: number, threshold = 0.8): number {
  const total = (card.s / F) * (Math.pow(threshold, 1 / C) - 1)
  return total - Math.max(0, now - card.last) / DAY
}

/** Median – robust gegen einzelne Ausreißer */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Stufen der Prognose-Skala */
export const PROGNOSIS_MARKS = [
  { days: 0, label: 'Gefahr' },
  { days: 14, label: '2 Wo.' },
  { days: 30, label: '1 Mon.' },
  { days: 182, label: '6 Mon.' },
  { days: 365, label: '1 J.' },
  { days: 1825, label: '5 J.+' },
] as const

/** Position (0–1) auf der Prognose-Skala, zwischen den Stufen logarithmisch */
export function prognosisPosition(days: number): number {
  const marks = PROGNOSIS_MARKS
  if (days <= 0) return 0
  const step = 1 / (marks.length - 1)
  for (let i = 1; i < marks.length; i++) {
    const a = marks[i - 1].days
    const b = marks[i].days
    if (days <= b) {
      const from = Math.log1p(a)
      const t = (Math.log1p(days) - from) / (Math.log1p(b) - from)
      return (i - 1 + t) * step
    }
  }
  return 1
}

/** „heute“, „morgen“, „in 3 Tagen“, „in 2 Wochen“, „in 4 Monaten“ */
export function formatDue(due: number, now: number): string {
  const days = (due - now) / DAY
  if (days <= 0.5) return 'heute'
  if (days <= 1.5) return 'morgen'
  if (days < 14) return `in ${Math.round(days)} Tagen`
  if (days < 60) return `in ${Math.round(days / 7)} Wochen`
  if (days < 365) return `in ${Math.round(days / 30)} Monaten`
  const years = Math.round(days / 365)
  return years === 1 ? 'in 1 Jahr' : `in ${years} Jahren`
}
