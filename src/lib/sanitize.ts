// Gespeicherte oder aus einer Sicherung gelesene Daten prüfen, bevor die App
// damit arbeitet. Unbekanntes fällt auf den Standard zurück. Reine Funktionen.

import { DEFAULT_SETTINGS, type ExamResult, type LearnState, type Settings } from './types.ts'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Einstellungen prüfen – Unbekanntes fällt auf den Standard zurück */
export function sanitizeSettings(stored: unknown): Settings {
  const s = isRecord(stored) ? stored : {}
  const pick = <T,>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback
  const settings: Settings = {
    readingMode: pick(s.readingMode, ['normal', 'speed'] as const, DEFAULT_SETTINGS.readingMode),
    wpm: typeof s.wpm === 'number' && Number.isFinite(s.wpm) ? s.wpm : DEFAULT_SETTINGS.wpm,
    fontSize: pick(s.fontSize, ['S', 'M', 'L', 'XL'] as const, DEFAULT_SETTINGS.fontSize),
    theme: pick(s.theme, ['auto', 'light', 'dark'] as const, DEFAULT_SETTINGS.theme),
    reviewBatch: pick(s.reviewBatch, [5, 10, 15, 20] as const, 10),
  }
  if (typeof s.lastBackupAt === 'number' && Number.isFinite(s.lastBackupAt)) settings.lastBackupAt = s.lastBackupAt
  return settings
}

/** Lernstand prüfen; null, wenn gar keiner vorliegt */
export function sanitizeLearn(stored: unknown): LearnState | null {
  if (!isRecord(stored)) return null
  const record = <T,>(value: unknown): Record<string, T> => (isRecord(value) ? (value as Record<string, T>) : {})
  const answers = isRecord(stored.answers) ? stored.answers : {}

  const examDates: Record<string, string> = {}
  for (const [courseId, date] of Object.entries(record<unknown>(stored.examDates))) {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) examDates[courseId] = date
  }
  const exams: Record<string, ExamResult> = {}
  for (const [courseId, result] of Object.entries(record<unknown>(stored.exams))) {
    if (isRecord(result) && typeof result.at === 'number' && typeof result.correct === 'number' && typeof result.total === 'number') {
      exams[courseId] = { at: result.at, correct: result.correct, total: result.total }
    }
  }

  return {
    tiles: record(stored.tiles),
    cards: record(stored.cards),
    days: record(stored.days),
    courseMs: record(stored.courseMs),
    answers: {
      total: typeof answers.total === 'number' ? answers.total : 0,
      correct: typeof answers.correct === 'number' ? answers.correct : 0,
    },
    lastCourseId: typeof stored.lastCourseId === 'string' ? stored.lastCourseId : undefined,
    examDates,
    exams,
  }
}
