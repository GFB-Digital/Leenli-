// Zentraler App-Zustand: Kurse, Lernstand, Einstellungen.
// Wird beim Start aus dem Gerätespeicher geladen; jede Änderung wird sofort
// gespeichert. Komponenten lesen ihn mit useAppState().

import { useSyncExternalStore } from 'react'
import { SAMPLE_COURSE } from '../content/sample-course.ts'
import { getItem, getStorageMode, removeItem, setItem, type StorageMode } from './db.ts'
import { validateCourses } from './importer.ts'
import { cardKey, tileQuestions } from './model.ts'
import { newCard, reviewCard } from './srs.ts'
import { dayKey } from './streak.ts'
import {
  DEFAULT_SETTINGS,
  EMPTY_LEARN,
  type Course,
  type DayActivity,
  type LearnState,
  type Settings,
} from './types.ts'

/** Fest eingebaute Kurse – können durch einen Import ersetzt, aber nicht gelöscht werden */
export const BUILTIN_COURSES: Course[] = [SAMPLE_COURSE]

const KEYS = {
  courses: 'courses',
  learn: 'learn',
  settings: 'settings',
  /** Fortschritt im alten Format (bis Phase 6) */
  legacyProgress: 'progress',
} as const

export interface AppState {
  loaded: boolean
  storage: StorageMode
  /** Selbst importierte Kurse */
  importedCourses: Course[]
  /** Alle Kurse in Anzeigereihenfolge (eingebaute + importierte) */
  courses: Course[]
  learn: LearnState
  settings: Settings
}

let state: AppState = {
  loaded: false,
  storage: 'device',
  importedCourses: [],
  courses: BUILTIN_COURSES,
  learn: EMPTY_LEARN,
  settings: DEFAULT_SETTINGS,
}

const listeners = new Set<() => void>()

function setState(patch: Partial<AppState>) {
  const next = { ...state, ...patch }
  if (patch.importedCourses) next.courses = combineCourses(patch.importedCourses)
  next.storage = getStorageMode()
  state = next
  listeners.forEach((listener) => listener())
}

/** Ein importierter Kurs mit gleicher ID ersetzt einen eingebauten */
function combineCourses(imported: Course[]): Course[] {
  const builtins = BUILTIN_COURSES.filter((b) => !imported.some((c) => c.id === b.id))
  return [...builtins, ...imported]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Gespeicherte Einstellungen prüfen – Unbekanntes fällt auf den Standard zurück */
function sanitizeSettings(stored: unknown): Settings {
  const s = isRecord(stored) ? stored : {}
  const pick = <T,>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback
  return {
    readingMode: pick(s.readingMode, ['normal', 'speed'] as const, DEFAULT_SETTINGS.readingMode),
    wpm: typeof s.wpm === 'number' && Number.isFinite(s.wpm) ? s.wpm : DEFAULT_SETTINGS.wpm,
    fontSize: pick(s.fontSize, ['S', 'M', 'L', 'XL'] as const, DEFAULT_SETTINGS.fontSize),
    theme: pick(s.theme, ['auto', 'light', 'dark'] as const, DEFAULT_SETTINGS.theme),
    reviewBatch: pick(s.reviewBatch, [5, 10, 15, 20] as const, 10),
    map3d: s.map3d === true,
  }
}

function sanitizeLearn(stored: unknown): LearnState | null {
  if (!isRecord(stored)) return null
  const record = <T,>(value: unknown): Record<string, T> => (isRecord(value) ? (value as Record<string, T>) : {})
  const answers = isRecord(stored.answers) ? stored.answers : {}
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
  }
}

/** Gespeicherte Kurse lesen; ältere („lessons“) werden dabei umgewandelt */
function loadCourses(stored: unknown): { courses: Course[]; converted: boolean } {
  if (!Array.isArray(stored)) return { courses: [], converted: false }
  const courses: Course[] = []
  let converted = false
  for (const raw of stored) {
    if (isRecord(raw) && 'lessons' in raw) converted = true
    const result = validateCourses(raw)
    if (result.ok) courses.push(...result.courses)
    else console.warn('Topos: gespeicherter Kurs konnte nicht gelesen werden', result.errors)
  }
  return { courses, converted }
}

/** Fortschritt aus dem alten Format: erledigte Lektionen → gelernte Kacheln */
function migrateLegacyProgress(stored: unknown, courses: Course[]): LearnState {
  const learn: LearnState = { ...EMPTY_LEARN, tiles: {}, cards: {}, days: {} }
  if (!isRecord(stored)) return learn
  for (const course of courses) {
    const lessons = stored[course.id]
    if (!isRecord(lessons)) continue
    for (const tile of course.tiles) {
      const result = lessons[tile.id]
      if (!isRecord(result)) continue
      const at = typeof result.completedAt === 'number' ? result.completedAt : Date.now()
      const correct = Number(result.correct) || 0
      const total = Number(result.total) || 0
      learn.tiles[course.id] = {
        ...learn.tiles[course.id],
        [tile.id]: { status: 'done', startedAt: at, completedAt: at, firstTry: { correct, total } },
      }
      for (const { step } of tileQuestions(tile)) {
        learn.cards[cardKey(course.id, tile.id, step)] = newCard(correct === total, at)
      }
      // Der damalige Abschluss zählt als Lerntag
      const day = learn.days[dayKey(at)] ?? { tiles: 0, reviews: 0, ms: 0 }
      learn.days[dayKey(at)] = { ...day, tiles: day.tiles + 1 }
    }
  }
  return learn
}

// ---------------------------------------------------------------------------
// Laden

export async function loadAppState() {
  const [storedCourses, storedLearn, storedSettings, legacy] = await Promise.all([
    getItem<unknown>(KEYS.courses),
    getItem<unknown>(KEYS.learn),
    getItem<unknown>(KEYS.settings),
    getItem<unknown>(KEYS.legacyProgress),
  ])

  const { courses: imported, converted } = loadCourses(storedCourses)
  let learn = sanitizeLearn(storedLearn)
  const migrate = !learn && legacy !== undefined
  if (!learn) learn = migrate ? migrateLegacyProgress(legacy, combineCourses(imported)) : EMPTY_LEARN

  setState({
    loaded: true,
    importedCourses: imported,
    learn,
    settings: sanitizeSettings(storedSettings),
  })

  // Umgewandeltes gleich im neuen Format sichern
  if (converted) await persist(KEYS.courses, imported)
  if (migrate) {
    await persist(KEYS.learn, learn)
    await removeItem(KEYS.legacyProgress)
  }
}

// ---------------------------------------------------------------------------
// Ändern

async function persist(key: string, value: unknown) {
  await setItem(key, value)
  // Falls das Speichern gerade auf den Arbeitsspeicher umgeschaltet hat → anzeigen
  if (getStorageMode() !== state.storage) setState({})
}

function updateLearn(change: (learn: LearnState) => LearnState) {
  const learn = change(state.learn)
  setState({ learn })
  return persist(KEYS.learn, learn)
}

function addToDay(learn: LearnState, now: number, patch: Partial<DayActivity>): LearnState['days'] {
  const key = dayKey(now)
  const day = learn.days[key] ?? { tiles: 0, reviews: 0, ms: 0 }
  return {
    ...learn.days,
    [key]: {
      tiles: day.tiles + (patch.tiles ?? 0),
      reviews: day.reviews + (patch.reviews ?? 0),
      ms: day.ms + (patch.ms ?? 0),
    },
  }
}

/** Kachel begonnen (zählt als „gerade am Lernen“) */
export function startTile(courseId: string, tileId: string) {
  const current = state.learn.tiles[courseId]?.[tileId]
  if (current) return Promise.resolve()
  return updateLearn((learn) => ({
    ...learn,
    lastCourseId: courseId,
    tiles: { ...learn.tiles, [courseId]: { ...learn.tiles[courseId], [tileId]: { status: 'learning', startedAt: Date.now() } } },
  }))
}

/**
 * Kachel abgeschlossen. `firstTry` enthält je Frage, ob sie beim ersten
 * Versuch richtig war – daraus entsteht der Start-Gedächtnisstand.
 */
export function finishTile(courseId: string, tileId: string, firstTry: Record<string, boolean>, ms: number) {
  const now = Date.now()
  return updateLearn((learn) => {
    const cards = { ...learn.cards }
    const results = Object.entries(firstTry)
    for (const [key, correct] of results) {
      if (!cards[key]) cards[key] = newCard(correct, now)
    }
    const correct = results.filter(([, ok]) => ok).length
    const previous = learn.tiles[courseId]?.[tileId]
    return {
      ...learn,
      cards,
      lastCourseId: courseId,
      tiles: {
        ...learn.tiles,
        [courseId]: {
          ...learn.tiles[courseId],
          [tileId]: {
            status: 'done',
            startedAt: previous?.startedAt ?? now,
            completedAt: now,
            firstTry: { correct, total: results.length },
          },
        },
      },
      days: addToDay(learn, now, { tiles: 1, ms }),
      courseMs: { ...learn.courseMs, [courseId]: (learn.courseMs[courseId] ?? 0) + ms },
      answers: { total: learn.answers.total + results.length, correct: learn.answers.correct + correct },
    }
  })
}

/** Ergebnis einer Wiederholungsrunde (nur erste Versuche zählen) */
export function finishReview(results: { key: string; courseId: string; correct: boolean }[], ms: number) {
  const now = Date.now()
  return updateLearn((learn) => {
    const cards = { ...learn.cards }
    for (const { key, correct } of results) {
      if (cards[key]) cards[key] = reviewCard(cards[key], correct, now)
    }
    // Lernzeit gleichmäßig auf die beteiligten Kurse verteilen
    const courseMs = { ...learn.courseMs }
    const share = results.length > 0 ? ms / results.length : 0
    for (const { courseId } of results) courseMs[courseId] = (courseMs[courseId] ?? 0) + share
    const correct = results.filter((r) => r.correct).length
    return {
      ...learn,
      cards,
      courseMs,
      days: addToDay(learn, now, { reviews: 1, ms }),
      answers: { total: learn.answers.total + results.length, correct: learn.answers.correct + correct },
    }
  })
}

/** Lesezeit ohne Fragen (zählt zur Lernzeit, gibt aber keinen Stempel) */
export function addReadingTime(courseId: string, ms: number) {
  if (ms <= 0) return Promise.resolve()
  const now = Date.now()
  return updateLearn((learn) => ({
    ...learn,
    days: addToDay(learn, now, { ms }),
    courseMs: { ...learn.courseMs, [courseId]: (learn.courseMs[courseId] ?? 0) + ms },
  }))
}

function withoutCards(cards: LearnState['cards'], prefix: string): LearnState['cards'] {
  return Object.fromEntries(Object.entries(cards).filter(([key]) => !key.startsWith(prefix)))
}

/** Kachel zurücksetzen: wieder „neu“, Gedächtnis-Stand ihrer Fragen gelöscht */
export function resetTile(courseId: string, tileId: string) {
  return updateLearn((learn) => {
    const tiles = { ...learn.tiles[courseId] }
    delete tiles[tileId]
    return {
      ...learn,
      tiles: { ...learn.tiles, [courseId]: tiles },
      cards: withoutCards(learn.cards, `${courseId}::${tileId}::`),
    }
  })
}

/** Gesamten Lernfortschritt zurücksetzen – Lerntage und Lernzeit bleiben */
export function resetProgress() {
  return updateLearn((learn) => ({ ...learn, tiles: {}, cards: {} }))
}

/** Kurse hinzufügen; ein Kurs mit gleicher ID ersetzt den vorhandenen an seiner Stelle */
export async function importCourses(courses: Course[]) {
  const imported = [...state.importedCourses]
  for (const course of courses) {
    const index = imported.findIndex((c) => c.id === course.id)
    if (index >= 0) imported[index] = course
    else imported.push(course)
  }
  setState({ importedCourses: imported })
  await persist(KEYS.courses, imported)
}

/** Importierten Kurs samt Lernstand entfernen */
export async function deleteCourse(courseId: string) {
  const importedCourses = state.importedCourses.filter((c) => c.id !== courseId)
  setState({ importedCourses })
  await persist(KEYS.courses, importedCourses)
  await updateLearn((learn) => {
    const tiles = { ...learn.tiles }
    delete tiles[courseId]
    const courseMs = { ...learn.courseMs }
    delete courseMs[courseId]
    return { ...learn, tiles, courseMs, cards: withoutCards(learn.cards, `${courseId}::`) }
  })
}

export function isBuiltinCourse(courseId: string): boolean {
  return BUILTIN_COURSES.some((c) => c.id === courseId)
}

export async function updateSettings(patch: Partial<Settings>) {
  const settings = { ...state.settings, ...patch }
  setState({ settings })
  await persist(KEYS.settings, settings)
}

// ---------------------------------------------------------------------------
// Lesen in React

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAppState(): AppState {
  return state
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getAppState)
}
