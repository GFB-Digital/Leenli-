// Datenmodell von Locus: Kurs → Kacheln → Schritte (Seiten und Fragen)

// ---------------------------------------------------------------------------
// Inhalte

export interface ImageRef {
  /** Bildadresse (https://…) */
  src: string
  /** Beschreibung für Screenreader */
  alt?: string
  /** Quelle und Lizenz, z. B. „Bild: …, gemeinfrei, via Wikimedia Commons“ */
  credit?: string
}

/** Leseseite. Absätze durch Leerzeile (\n\n) getrennt, **fett** für Schlüsselbegriffe */
export interface TextStep {
  type: 'text'
  title?: string
  text: string
  image?: ImageRef
}

/** Auswahlfrage mit 2–6 Antworten (werden beim Anzeigen gemischt) */
export interface ChoiceStep {
  type: 'choice'
  question: string
  options: string[]
  /** Index der richtigen Antwort in `options` */
  answer: number
  explanation?: string
}

/** Entweder-oder: eine Antwort oben, eine unten (z. B. Fallbeispiel) */
export interface BinaryStep {
  type: 'binary'
  question: string
  options: [string, string]
  answer: 0 | 1
  explanation?: string
}

export interface TrueFalseStep {
  type: 'truefalse'
  statement: string
  answer: boolean
  explanation?: string
}

/** Lückentext: `text` enthält genau eine Lücke „___“ */
export interface ClozeStep {
  type: 'cloze'
  text: string
  options: string[]
  answer: number
  explanation?: string
}

export type QuestionStep = ChoiceStep | BinaryStep | TrueFalseStep | ClozeStep
export type Step = TextStep | QuestionStep

/** Eine Kachel = eine kurze Lerneinheit */
export interface Tile {
  id: string
  title: string
  emoji?: string
  /** „Du lernst …“ – Leitfragen, die man zu Beginn aufdeckt */
  intro?: string[]
  steps: Step[]
  /** „Rückblick“ – Kernaussagen am Ende */
  recap?: string[]
}

export interface Course {
  id: string
  title: string
  emoji?: string
  description?: string
  /** Farbname aus der Palette (siehe colors.ts) */
  color?: string
  tiles: Tile[]
}

// ---------------------------------------------------------------------------
// Lernstand

export interface TileState {
  status: 'learning' | 'done'
  startedAt: number
  completedAt?: number
  /** Ergebnis beim ersten Durcharbeiten */
  firstTry?: { correct: number; total: number }
}

/** Gedächtnis-Stand einer Frage (Spaced Repetition, siehe srs.ts) */
export interface CardState {
  /** Stabilität in Tagen: nach dieser Zeit weiß man es noch zu ~90 % */
  s: number
  /** Wachstumsfaktor (schwierige Fragen wachsen langsamer) */
  ease: number
  /** letzte Wiederholung (ms) */
  last: number
  /** fällig ab (ms) */
  due: number
  reps: number
  lapses: number
}

export interface DayActivity {
  tiles: number
  reviews: number
  /** Lernzeit in ms */
  ms: number
}

export interface LearnState {
  /** tiles[kursId][kachelId] */
  tiles: Record<string, Record<string, TileState>>
  /** cards[kartenSchlüssel] – siehe cardKey() in model.ts */
  cards: Record<string, CardState>
  /** days["JJJJ-MM-TT"] */
  days: Record<string, DayActivity>
  /** Lernzeit pro Kurs in ms */
  courseMs: Record<string, number>
  answers: { total: number; correct: number }
  /** zuletzt gelernter Kurs (für „Schlau lernen“) */
  lastCourseId?: string
}

export const EMPTY_LEARN: LearnState = {
  tiles: {},
  cards: {},
  days: {},
  courseMs: {},
  answers: { total: 0, correct: 0 },
}

// ---------------------------------------------------------------------------
// Einstellungen

export type ReadingMode = 'normal' | 'speed'
export type FontSize = 'S' | 'M' | 'L' | 'XL'
export type Theme = 'auto' | 'light' | 'dark'

export interface Settings {
  readingMode: ReadingMode
  wpm: number
  fontSize: FontSize
  theme: Theme
  /** Fragen pro Wiederholungsrunde */
  reviewBatch: number
  /** Testmodus: Wissenskarte als 3D-Säulen */
  map3d: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  readingMode: 'normal',
  wpm: 300,
  fontSize: 'M',
  theme: 'auto',
  reviewBatch: 10,
  map3d: false,
}

export function isQuestion(step: Step): step is QuestionStep {
  return step.type !== 'text'
}
