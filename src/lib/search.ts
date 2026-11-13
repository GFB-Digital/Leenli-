// Suche über alle Kurse: Kurstitel, Kacheltitel, Leseseiten und Fragen.
// Reine Funktionen → search.test.ts.

import { correctLabel, questionText, stripMarkup } from './model.ts'
import { isQuestion, type Course } from './types.ts'

export interface SearchHit {
  courseId: string
  /** fehlt bei einem Treffer im Kurstitel */
  tileId?: string
  kind: 'course' | 'tile' | 'page' | 'question'
  /** Kurstitel bzw. Kacheltitel */
  title: string
  /** Kurs, zu dem der Treffer gehört (bei Kacheln, Seiten, Fragen) */
  context?: string
  /** Textstelle rund um den Treffer */
  snippet?: string
}

/** Klein schreiben und Umlaute angleichen, damit „Gross“ auch „groß“ findet */
function fold(text: string): string {
  return text
    .toLocaleLowerCase('de')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Textstelle um das erste gefundene Wort, auf ganze Wörter gekürzt */
export function snippetAround(text: string, words: string[], radius = 60): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const folded = fold(clean)
  // fold() kann die Länge ändern (ß → ss); für einen Ausschnitt reicht die ungefähre Stelle
  const found = words.map((word) => folded.indexOf(word)).filter((i) => i >= 0)
  const at = found.length > 0 ? Math.min(...found, clean.length) : 0
  let start = Math.max(0, at - radius)
  let end = Math.min(clean.length, at + radius)
  if (start > 0) start = clean.indexOf(' ', start) + 1 || start
  if (end < clean.length) end = clean.lastIndexOf(' ', end) > start ? clean.lastIndexOf(' ', end) : end
  return `${start > 0 ? '… ' : ''}${clean.slice(start, end)}${end < clean.length ? ' …' : ''}`
}

/**
 * Sucht alle Wörter der Anfrage (jedes muss vorkommen, Groß-/Kleinschreibung egal).
 * Reihenfolge der Treffer: Kurse, Kacheln, Seiten, Fragen. Je Kachel höchstens
 * ein Seiten- und ein Fragentreffer, damit die Liste übersichtlich bleibt.
 */
export function searchCourses(courses: Course[], query: string, limit = 40): SearchHit[] {
  const words = fold(query).split(/\s+/).filter((word) => word.length > 0)
  if (words.length === 0 || words.every((word) => word.length < 2)) return []
  const matches = (text: string) => {
    const folded = fold(text)
    return words.every((word) => folded.includes(word))
  }

  const byKind: Record<SearchHit['kind'], SearchHit[]> = { course: [], tile: [], page: [], question: [] }
  for (const course of courses) {
    if (matches(`${course.title} ${course.description ?? ''} ${course.group ?? ''}`)) {
      byKind.course.push({ courseId: course.id, kind: 'course', title: course.title, snippet: course.description })
    }
    for (const tile of course.tiles) {
      const base = { courseId: course.id, tileId: tile.id, title: tile.title, context: course.title }
      if (matches(tile.title)) byKind.tile.push({ ...base, kind: 'tile' })
      let page = false
      let question = false
      for (const step of tile.steps) {
        if (!isQuestion(step)) {
          const text = stripMarkup(step.text)
          if (!page && matches(`${step.title ?? ''} ${text}`)) {
            page = true
            // Ausschnitt nur aus dem Lesetext (steht das Wort nur in der Überschrift: der Anfang der Seite)
            byKind.page.push({ ...base, kind: 'page', snippet: snippetAround(text, words) })
          }
        } else {
          const text = `${questionText(step)} ${correctLabel(step)} ${step.explanation ?? ''}`
          if (!question && matches(text)) {
            question = true
            byKind.question.push({ ...base, kind: 'question', snippet: snippetAround(questionText(step), words, 90) })
          }
        }
      }
    }
  }
  return [...byKind.course, ...byKind.tile, ...byKind.page, ...byKind.question].slice(0, limit)
}
