// Lerntage: an jedem Tag mit mindestens einer abgeschlossenen Kachel oder
// Wiederholungsrunde gibt es einen Stempel. Reine Funktionen → streak.test.ts.

import type { DayActivity } from './types.ts'

/** „2026-11-12“ in Ortszeit */
export function dayKey(time: number | Date = Date.now()): string {
  const date = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12) // Mittag: kein Ärger mit der Zeitumstellung
}

export function addDays(key: string, days: number): string {
  const date = fromKey(key)
  date.setDate(date.getDate() + days)
  return dayKey(date)
}

export function hasStamp(day: DayActivity | undefined): boolean {
  return !!day && (day.tiles > 0 || day.reviews > 0)
}

export function totalStamps(days: Record<string, DayActivity>): number {
  return Object.values(days).filter(hasStamp).length
}

/**
 * Aktuelle Serie in Tagen. Zählt bis heute – ist heute noch nichts gelernt,
 * bleibt die Serie von gestern bestehen (man hat ja noch Zeit).
 */
export function currentStreak(days: Record<string, DayActivity>, today: string): number {
  let key = hasStamp(days[today]) ? today : addDays(today, -1)
  let count = 0
  while (hasStamp(days[key])) {
    count++
    key = addDays(key, -1)
  }
  return count
}

/** Montag bis Sonntag der Woche, in der `today` liegt */
export function weekKeys(today: string): string[] {
  const weekday = (fromKey(today).getDay() + 6) % 7 // Montag = 0
  const monday = addDays(today, -weekday)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Kalenderblatt eines Monats (Wochen ab Montag); null = Feld außerhalb des Monats */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1, 12)
  const lead = (first.getDay() + 6) % 7
  const length = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= length; d++) cells.push(dayKey(new Date(year, month, d, 12)))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

export const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const
