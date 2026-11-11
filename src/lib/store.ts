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
    settings: { ...DEFAULT_SETTINGS, ...(isRecord(settings) ? settings : {}) },
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
