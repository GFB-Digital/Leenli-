// Datenmodell von Leenli: Kurs → Lektionen → Schritte

export interface TextStep {
  type: 'text'
  title?: string
  /** Absätze sind durch eine Leerzeile (\n\n) getrennt */
  text: string
}

export interface ChoiceStep {
  type: 'choice'
  question: string
  options: string[]
  /** Index der richtigen Option in `options` (die App mischt beim Anzeigen) */
  answer: number
  explanation?: string
}

export interface TrueFalseStep {
  type: 'truefalse'
  statement: string
  answer: boolean
  explanation?: string
}

export type QuestionStep = ChoiceStep | TrueFalseStep
export type Step = TextStep | QuestionStep

export interface Lesson {
  id: string
  title: string
  steps: Step[]
}

export interface Course {
  id: string
  title: string
  emoji?: string
  description?: string
  lessons: Lesson[]
}

// ---------------------------------------------------------------------------
// Fortschritt

export interface LessonResult {
  /** richtig beantwortete Fragen im letzten Durchgang */
  correct: number
  /** Anzahl Fragen in der Lektion */
  total: number
  /** Zeitpunkt (ms seit 1970) */
  completedAt: number
}

/** Fortschritt[kursId][lektionsId] */
export type Progress = Record<string, Record<string, LessonResult>>

// ---------------------------------------------------------------------------
// Einstellungen

export type ReadingMode = 'normal' | 'speed'
export type FontSize = 'S' | 'M' | 'L' | 'XL'
export type Theme = 'auto' | 'light' | 'dark'

export interface Settings {
  /** Standard-Lesemodus für Textabschnitte */
  readingMode: ReadingMode
  /** Tempo des Speed-Readers in Wörtern pro Minute */
  wpm: number
  /** Schriftgröße im normalen Lesemodus */
  fontSize: FontSize
  theme: Theme
}

export const DEFAULT_SETTINGS: Settings = {
  readingMode: 'normal',
  wpm: 300,
  fontSize: 'M',
  theme: 'auto',
}

export function isQuestion(step: Step): step is QuestionStep {
  return step.type === 'choice' || step.type === 'truefalse'
}
