// Sicherung als Datei: importierte Kurse, Lernstand und Einstellungen in einer
// JSON-Datei. Damit übersteht der Lernstand eine Neu-Installation, einen
// Gerätewechsel oder einen vom System geleerten Speicher.
// Reine Funktionen → backup.test.ts. Das Speichern der Datei selbst macht files.ts.

import { validateCourses } from './importer.ts'
import { isRecord, sanitizeLearn, sanitizeSettings } from './sanitize.ts'
import { dayKey } from './streak.ts'
import type { Course, LearnState, Settings } from './types.ts'

export const BACKUP_FORMAT = 'topos-sicherung'
/** Wird erhöht, wenn sich der Aufbau der Datei ändert */
export const BACKUP_VERSION = 1

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  /** Zeitpunkt der Sicherung (ISO) */
  exportedAt: string
  /** selbst importierte Kurse (der eingebaute Beispielkurs steckt in der App) */
  courses: Course[]
  learn: LearnState
  settings: Settings
}

export function createBackup(data: { courses: Course[]; learn: LearnState; settings: Settings }, now: Date = new Date()): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    courses: data.courses,
    learn: data.learn,
    settings: data.settings,
  }
}

/** „topos-sicherung-2026-11-13.json“ */
export function backupFileName(now: Date = new Date()): string {
  return `topos-sicherung-${dayKey(now)}.json`
}

/** Ist das (schon gelesene) JSON eine Sicherung und kein Kurs? */
export function isBackup(data: unknown): boolean {
  return isRecord(data) && data.format === BACKUP_FORMAT
}

export interface BackupSummary {
  exportedAt: number | null
  courses: number
  /** gelernte Kacheln */
  tiles: number
  /** Fragen mit Wiederholungsstand */
  cards: number
  /** Tage mit Lernzeit */
  days: number
}

export type BackupOutcome =
  | { ok: true; backup: Backup; summary: BackupSummary }
  | { ok: false; errors: string[] }

/** Liest und prüft eine Sicherungsdatei */
export function parseBackup(raw: string): BackupOutcome {
  let data: unknown
  try {
    data = JSON.parse(raw.replace(/^\ufeff/, ''))
  } catch {
    return { ok: false, errors: ['Die Datei ist kein gültiges JSON. Ist es wirklich eine Sicherung aus ΤΟΠΟΣ?'] }
  }
  if (!isBackup(data) || !isRecord(data)) {
    return { ok: false, errors: ['Das ist keine Sicherung aus ΤΟΠΟΣ. Kurse importierst du oben unter „Kurs importieren“.'] }
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    return { ok: false, errors: ['Die Sicherung stammt aus einer neueren Version der App. Bitte aktualisiere ΤΟΠΟΣ zuerst.'] }
  }

  let courses: Course[] = []
  if (Array.isArray(data.courses) && data.courses.length > 0) {
    const result = validateCourses(data.courses)
    if (!result.ok) return { ok: false, errors: ['Die Kurse in der Sicherung sind beschädigt:', ...result.errors] }
    courses = result.courses
  }
  const learn = sanitizeLearn(data.learn)
  if (!learn) return { ok: false, errors: ['In der Sicherung fehlt der Lernstand.'] }
  const settings = sanitizeSettings(data.settings)

  const exportedAt = typeof data.exportedAt === 'string' ? Date.parse(data.exportedAt) : Number.NaN
  const tiles = Object.values(learn.tiles).reduce(
    (sum, perCourse) => sum + Object.values(perCourse ?? {}).filter((tile) => tile?.status === 'done').length,
    0,
  )
  return {
    ok: true,
    backup: { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: String(data.exportedAt ?? ''), courses, learn, settings },
    summary: {
      exportedAt: Number.isNaN(exportedAt) ? null : exportedAt,
      courses: courses.length,
      tiles,
      cards: Object.keys(learn.cards).length,
      days: Object.keys(learn.days).length,
    },
  }
}
