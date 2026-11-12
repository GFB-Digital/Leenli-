// Hilfsfunktionen rund um Kurse, Kacheln und Fragen (ohne Seiteneffekte)

import {
  isQuestion,
  type Course,
  type LearnState,
  type QuestionStep,
  type Tile,
  type TileState,
} from './types.ts'

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

// ---------------------------------------------------------------------------
// Text

/** Text in Absätze zerlegen (getrennt durch eine Leerzeile) */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

/** „**fett**“ → Abschnitte mit bold-Markierung */
export function inlineSegments(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    )
}

/** Markierungen entfernen (für den Speed-Reader) */
export function stripMarkup(text: string): string {
  return text.replace(/\*\*/g, '')
}

/** Zufällige Reihenfolge der Zahlen 0 … count-1 (Fisher-Yates) */
export function shuffledIndices(count: number, random: () => number = Math.random): number[] {
  const result = Array.from({ length: count }, (_, i) => i)
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ---------------------------------------------------------------------------
// Fragen

export interface Choice {
  /** Original-Index der Antwort (bei Richtig/Falsch: 1 = stimmt, 0 = stimmt nicht) */
  value: number
  label: string
}

export function questionText(step: QuestionStep): string {
  switch (step.type) {
    case 'truefalse':
      return step.statement
    case 'cloze':
      return step.text
    default:
      return step.question
  }
}

export function questionChoices(step: QuestionStep, order: number[]): Choice[] {
  if (step.type === 'truefalse') {
    return [
      { value: 1, label: 'Stimmt' },
      { value: 0, label: 'Stimmt nicht' },
    ]
  }
  const options = step.options as string[]
  const indices = order.length === options.length ? order : options.map((_, i) => i)
  return indices.map((i) => ({ value: i, label: options[i] }))
}

export function correctValue(step: QuestionStep): number {
  if (step.type === 'truefalse') return step.answer ? 1 : 0
  return step.answer
}

export function correctLabel(step: QuestionStep): string {
  if (step.type === 'truefalse') return step.answer ? 'Die Aussage stimmt.' : 'Die Aussage stimmt nicht.'
  return step.options[step.answer]
}

/** Kurzer, stabiler Fingerabdruck einer Frage (FNV-1a) */
export function questionKey(step: QuestionStep): string {
  let hash = 0x811c9dc5
  for (const char of `${step.type}|${questionText(step)}`) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}

/** Schlüssel einer Frage im Lernstand */
export function cardKey(courseId: string, tileId: string, step: QuestionStep): string {
  return `${courseId}::${tileId}::${questionKey(step)}`
}

export function tileQuestions(tile: Tile): { step: QuestionStep; index: number }[] {
  return tile.steps.flatMap((step, index) => (isQuestion(step) ? [{ step, index }] : []))
}

export function tileStats(tile: Tile) {
  const questions = tile.steps.filter(isQuestion).length
  return { pages: tile.steps.length - questions, questions }
}

// ---------------------------------------------------------------------------
// Lernstand

export function tileState(learn: LearnState, courseId: string, tileId: string): TileState | undefined {
  return learn.tiles[courseId]?.[tileId]
}

export function tileStatus(learn: LearnState, courseId: string, tileId: string): 'new' | 'learning' | 'done' {
  return tileState(learn, courseId, tileId)?.status ?? 'new'
}

export function courseStats(course: Course, learn: LearnState) {
  const done = course.tiles.filter((tile) => tileStatus(learn, course.id, tile.id) === 'done').length
  const total = course.tiles.length
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
}

/** Nächste Kachel zum Lernen: zuerst eine angefangene, sonst die erste neue */
export function nextTile(course: Course, learn: LearnState): Tile | undefined {
  return (
    course.tiles.find((tile) => tileStatus(learn, course.id, tile.id) === 'learning') ??
    course.tiles.find((tile) => tileStatus(learn, course.id, tile.id) === 'new')
  )
}

/** „2 h 15 min“, „12 min“, „< 1 min“ */
export function formatStudyTime(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return ms > 0 ? '< 1 min' : '0 min'
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`
}
