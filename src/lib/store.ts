// Zentraler App-Zustand: Kurse, Fortschritt, Einstellungen.
// Wird beim Start aus dem Gerätespeicher geladen; jede Änderung wird sofort
// gespeichert. Komponenten lesen ihn mit useAppState().

import { useSyncExternalStore } from 'react'
import { SAMPLE_COURSE } from '../content/sample-course.ts'
import { getItem, getStorageMode, setItem, type StorageMode } from './db.ts'
import { DEFAULT_SETTINGS, type Course, type LessonResult, type Progress, type Settings } from './types.ts'

/** Fest eingebaute Kurse – können nicht gelöscht werden */
export const BUILTIN_COURSES: Course[] = [SAMPLE_COURSE]

const KEYS = {
  courses: 'courses',
  progress: 'progress',
  settings: 'settings',
} as const

export interface AppState {
  loaded: boolean
  storage: StorageMode
  /** Selbst importierte Kurse */
  importedCourses: Course[]
  /** Alle Kurse in Anzeigereihenfolge (eingebaute + importierte) */
  courses: Course[]
  progress: Progress
  settings: Settings
}

let state: AppState = {
  loaded: false,
  storage: 'device',
  importedCourses: [],
  courses: BUILTIN_COURSES,
  progress: {},
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
  }
}

// ---------------------------------------------------------------------------
// Laden

export async function loadAppState() {
  const [courses, progress, settings] = await Promise.all([
    getItem<unknown>(KEYS.courses),
    getItem<unknown>(KEYS.progress),
    getItem<unknown>(KEYS.settings),
  ])
  setState({
    loaded: true,
    importedCourses: Array.isArray(courses) ? (courses as Course[]) : [],
    progress: isRecord(progress) ? (progress as Progress) : {},
    settings: sanitizeSettings(settings),
  })
}

// ---------------------------------------------------------------------------
// Ändern

async function persist(key: string, value: unknown) {
  await setItem(key, value)
  // Falls das Speichern gerade auf den Arbeitsspeicher umgeschaltet hat → anzeigen
  if (getStorageMode() !== state.storage) setState({})
}

export async function saveLessonResult(courseId: string, lessonId: string, result: LessonResult) {
  const progress: Progress = {
    ...state.progress,
    [courseId]: { ...state.progress[courseId], [lessonId]: result },
  }
  setState({ progress })
  await persist(KEYS.progress, progress)
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

/** Importierten Kurs samt Fortschritt entfernen */
export async function deleteCourse(courseId: string) {
  const importedCourses = state.importedCourses.filter((c) => c.id !== courseId)
  const progress = { ...state.progress }
  delete progress[courseId]
  setState({ importedCourses, progress })
  await persist(KEYS.courses, importedCourses)
  await persist(KEYS.progress, progress)
}

export function isBuiltinCourse(courseId: string): boolean {
  return BUILTIN_COURSES.some((c) => c.id === courseId)
}

export async function resetProgress() {
  setState({ progress: {} })
  await persist(KEYS.progress, {})
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
