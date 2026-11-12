// Import eigener Kurse: JSON lesen, gründlich prüfen, verständliche deutsche
// Fehlermeldungen erzeugen. Reine Funktionen → getestet in importer.test.ts.

import type { ChoiceStep, Course, Lesson, Step, TrueFalseStep } from './types.ts'

export type ParseOutcome =
  | { ok: true; courses: Course[]; notes: string[] }
  | { ok: false; errors: string[] }

/** Mehr Fehler auf einmal zeigen wäre unübersichtlich */
export const MAX_ERRORS = 25

const STEP_TYPES = '"text", "choice" oder "truefalse"'

// ---------------------------------------------------------------------------
// Hilfsfunktionen

type Obj = Record<string, unknown>

function isObject(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function shorten(text: string, max = 40): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}

function titled(base: string, title: unknown): string {
  return isText(title) ? `${base} („${shorten(title)}“)` : base
}

/** „Über das Gedächtnis!“ → „ueber-das-gedaechtnis“ */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48)
    .replace(/^-+|-+$/g, '')
}

/** Hängt -2, -3 … an, bis die ID noch nicht vergeben ist */
export function uniqueId(base: string, taken: Set<string>): string {
  const start = base || 'kurs'
  let id = start
  for (let n = 2; taken.has(id); n++) id = `${start}-${n}`
  return id
}

// ---------------------------------------------------------------------------
// Text → JSON

/**
 * Holt das JSON aus dem eingefügten Text: entfernt ```json-Rahmen und
 * Begleittext wie „Hier ist dein Kurs:“.
 */
export function extractJson(raw: string): string {
  const text = raw.replace(/^\uFEFF/, '').trim()

  // Codeblöcke: ``` am Zeilenanfang. Ein bloß erwähntes „```json“ im Fließtext zählt nicht.
  const fence = /(?:^|\n)[ \t]*```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)(?:\r?\n[ \t]*```|$)/g
  for (const match of text.matchAll(fence)) {
    const content = match[1].trim()
    if (content.startsWith('{') || content.startsWith('[')) return content
  }

  const start = text.search(/[[{]/)
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
  if (start >= 0 && end > start) return text.slice(start, end + 1)
  return text.replace(/^```[a-zA-Z]*/, '').trim()
}

function describeJsonError(error: unknown, text: string): string[] {
  const message = error instanceof Error ? error.message : String(error)
  let line: number | undefined
  let column: number | undefined

  const lineColumn = message.match(/line (\d+) column (\d+)/i)
  const position = message.match(/position (\d+)/i)
  if (lineColumn) {
    line = Number(lineColumn[1])
    column = Number(lineColumn[2])
  } else if (position) {
    const before = text.slice(0, Number(position[1]))
    line = before.split('\n').length
    column = before.length - before.lastIndexOf('\n')
  }

  const errors = [
    line !== undefined
      ? `Das JSON ist nicht gültig – der Fehler steckt in Zeile ${line}, Spalte ${column}.`
      : 'Das JSON ist nicht gültig.',
  ]
  if (line !== undefined) {
    const content = text.split('\n')[line - 1]
    if (content?.trim()) errors.push(`Zeile ${line}: ${shorten(content.trim(), 80)}`)
  }

  // Häufige Ursachen gezielt benennen
  if (/[“”„]\s*:/.test(text) || /:\s*[“”„]/.test(text)) {
    errors.push('Tipp: Es stehen typografische Anführungszeichen („ “) im JSON. Nötig sind gerade: "')
  } else if (/,\s*[}\]]/.test(text)) {
    errors.push('Tipp: Nach dem letzten Element einer Liste oder eines Objekts darf kein Komma stehen.')
  } else if (/'[^']*'\s*:/.test(text)) {
    errors.push('Tipp: Namen und Texte brauchen doppelte Anführungszeichen (") statt einfacher (\').')
  } else {
    errors.push('Tipp: Oft fehlt ein Komma zwischen zwei Einträgen oder eine Klammer ist nicht geschlossen.')
  }
  return errors
}

// ---------------------------------------------------------------------------
// Prüfen

interface Context {
  errors: string[]
  notes: string[]
}

function validateStep(value: unknown, where: string, ctx: Context): Step | null {
  if (!isObject(value)) {
    ctx.errors.push(`${where}: Erwartet wird ein Objekt { … }.`)
    return null
  }
  const type = value.type
  if (type === undefined) {
    ctx.errors.push(`${where}: Die Angabe „type“ fehlt (${STEP_TYPES}).`)
    return null
  }

  const optional = (key: string): string | undefined => {
    const field = value[key]
    if (field === undefined || field === null || field === '') return undefined
    if (typeof field !== 'string') {
      ctx.errors.push(`${where}: „${key}“ muss ein Text sein.`)
      return undefined
    }
    return field.trim()
  }
  const required = (key: string, label: string): string | null => {
    const field = value[key]
    if (!isText(field)) {
      ctx.errors.push(`${where}: ${label} („${key}“) fehlt oder ist leer.`)
      return null
    }
    return field.trim()
  }

  if (type === 'text') {
    const text = required('text', 'Der Lesetext')
    const title = optional('title')
    if (text === null) return null
    return title ? { type, title, text } : { type, text }
  }

  if (type === 'choice') {
    const question = required('question', 'Die Frage')
    const explanation = optional('explanation')
    const options = value.options
    if (!Array.isArray(options) || options.length < 2) {
      ctx.errors.push(`${where}: „options“ muss eine Liste mit mindestens 2 Antworten sein.`)
      return null
    }
    const badOption = options.findIndex((option) => !isText(option))
    if (badOption >= 0) {
      ctx.errors.push(`${where}: Antwort ${badOption + 1} in „options“ ist leer oder kein Text.`)
      return null
    }
    const answer = value.answer
    const last = options.length - 1
    if (typeof answer !== 'number' || !Number.isInteger(answer)) {
      ctx.errors.push(
        `${where}: „answer“ muss die Nummer der richtigen Antwort sein (0 = erste, ${last} = letzte).`,
      )
      return null
    }
    if (answer < 0 || answer > last) {
      ctx.errors.push(
        `${where}: „answer“ ist ${answer}, erlaubt sind aber nur 0 bis ${last}. Die Zählung beginnt bei 0.`,
      )
      return null
    }
    if (question === null) return null
    const step: ChoiceStep = {
      type,
      question,
      options: (options as string[]).map((option) => option.trim()),
      answer,
    }
    if (explanation) step.explanation = explanation
    return step
  }

  if (type === 'truefalse') {
    const statement = required('statement', 'Die Aussage')
    const explanation = optional('explanation')
    const answer = value.answer
    if (typeof answer !== 'boolean') {
      const hint = answer === 'true' || answer === 'false' ? ' – ohne Anführungszeichen' : ''
      ctx.errors.push(`${where}: „answer“ muss true oder false sein${hint}.`)
      return null
    }
    if (statement === null) return null
    const step: TrueFalseStep = { type, statement, answer }
    if (explanation) step.explanation = explanation
    return step
  }

  ctx.errors.push(`${where}: Unbekannter Typ „${String(type)}“. Erlaubt sind ${STEP_TYPES}.`)
  return null
}

function validateLesson(
  value: unknown,
  index: number,
  courseLabel: string,
  takenIds: Set<string>,
  ctx: Context,
): { lesson: Lesson | null; generatedId: boolean } {
  const where = `${courseLabel} › ${titled(`Lektion ${index + 1}`, isObject(value) ? value.title : undefined)}`
  if (!isObject(value)) {
    ctx.errors.push(`${where}: Erwartet wird ein Objekt { … }.`)
    return { lesson: null, generatedId: false }
  }

  const title = isText(value.title) ? value.title.trim() : null
  if (!title) ctx.errors.push(`${where}: Der Titel („title“) fehlt oder ist leer.`)

  // ID: vorhanden → prüfen; fehlt → aus dem Titel erzeugen
  let id: string | null = null
  let generatedId = false
  if (value.id === undefined || value.id === null || value.id === '') {
    id = uniqueId(slugify(title ?? '') || `lektion-${index + 1}`, takenIds)
    generatedId = true
  } else if (isText(value.id) || typeof value.id === 'number') {
    id = String(value.id).trim()
    if (takenIds.has(id)) {
      ctx.errors.push(`${where}: Die Lektions-ID „${id}“ kommt in diesem Kurs mehrfach vor.`)
    }
  } else {
    ctx.errors.push(`${where}: „id“ muss ein Text sein.`)
  }
  if (id) takenIds.add(id)

  const steps = value.steps
  if (!Array.isArray(steps) || steps.length === 0) {
    ctx.errors.push(`${where}: „steps“ muss eine Liste mit mindestens einem Schritt sein.`)
    return { lesson: null, generatedId }
  }

  const checked = steps.map((step, k) => {
    const kind =
      isObject(step) && step.type === 'text'
        ? 'Text'
        : isObject(step) && (step.type === 'choice' || step.type === 'truefalse')
          ? 'Frage'
          : ''
    return validateStep(step, `${where} › Schritt ${k + 1}${kind ? ` (${kind})` : ''}`, ctx)
  })

  if (!title || !id || checked.some((step) => step === null)) return { lesson: null, generatedId }
  return { lesson: { id, title, steps: checked as Step[] }, generatedId }
}

function validateCourse(value: unknown, index: number, total: number, ctx: Context): Course | null {
  const base = total > 1 ? `Kurs ${index + 1}` : 'Kurs'
  const label = titled(base, isObject(value) ? value.title : undefined)
  if (!isObject(value)) {
    ctx.errors.push(`${label}: Erwartet wird ein Objekt { … }.`)
    return null
  }

  const title = isText(value.title) ? value.title.trim() : null
  if (!title) ctx.errors.push(`${label}: Der Titel („title“) fehlt oder ist leer.`)

  let id: string | null = null
  if (value.id === undefined || value.id === null || value.id === '') {
    id = slugify(title ?? '') || 'kurs'
    ctx.notes.push(`${label}: Keine ID angegeben – „${id}“ wird verwendet.`)
  } else if (isText(value.id) || typeof value.id === 'number') {
    id = String(value.id).trim()
  } else {
    ctx.errors.push(`${label}: „id“ muss ein Text sein.`)
  }

  const optional = (key: 'emoji' | 'description'): string | undefined => {
    const field = value[key]
    if (field === undefined || field === null || field === '') return undefined
    if (typeof field !== 'string') {
      ctx.errors.push(`${label}: „${key}“ muss ein Text sein.`)
      return undefined
    }
    return field.trim() || undefined
  }
  const emoji = optional('emoji')
  const description = optional('description')

  const lessons = value.lessons
  if (!Array.isArray(lessons) || lessons.length === 0) {
    ctx.errors.push(`${label}: „lessons“ muss eine Liste mit mindestens einer Lektion sein.`)
    return null
  }

  const takenLessonIds = new Set<string>()
  let generated = 0
  const checked = lessons.map((lesson, j) => {
    const result = validateLesson(lesson, j, label, takenLessonIds, ctx)
    if (result.generatedId) generated++
    return result.lesson
  })
  if (generated > 0) {
    ctx.notes.push(
      generated === 1
        ? `${label}: 1 fehlende Lektions-ID wurde ergänzt.`
        : `${label}: ${generated} fehlende Lektions-IDs wurden ergänzt.`,
    )
  }

  if (!title || !id || checked.some((lesson) => lesson === null)) return null
  const course: Course = { id, title, lessons: checked as Lesson[] }
  if (emoji) course.emoji = emoji
  if (description) course.description = description
  return course
}

// ---------------------------------------------------------------------------
// Einstieg

/** Liest einen Kurs oder eine Liste von Kursen aus eingefügtem Text */
export function parseCourses(raw: string): ParseOutcome {
  const text = extractJson(raw)
  if (!text) return { ok: false, errors: ['Es wurde nichts eingefügt.'] }

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    return { ok: false, errors: describeJsonError(error, text) }
  }

  const list = Array.isArray(data)
    ? data
    : isObject(data) && Array.isArray(data.courses)
      ? data.courses
      : isObject(data)
        ? [data]
        : null
  if (!list) {
    return {
      ok: false,
      errors: ['Erwartet wird ein Kurs { … } oder eine Liste von Kursen [ … ].'],
    }
  }
  if (list.length === 0) return { ok: false, errors: ['Die Liste enthält keinen Kurs.'] }

  const ctx: Context = { errors: [], notes: [] }
  const courses: Course[] = []
  const seen = new Set<string>()
  list.forEach((value, i) => {
    const course = validateCourse(value, i, list.length, ctx)
    if (!course) return
    if (seen.has(course.id)) {
      ctx.errors.push(`${titled(`Kurs ${i + 1}`, course.title)}: Die ID „${course.id}“ kommt in diesem Import mehrfach vor.`)
    }
    seen.add(course.id)
    courses.push(course)
  })

  if (ctx.errors.length > 0) return { ok: false, errors: ctx.errors }
  return { ok: true, courses, notes: ctx.notes }
}

/**
 * „Als neuen Kurs hinzufügen“: Kurse, deren ID schon vergeben ist, bekommen
 * eine neue („kurs-2“). Heißt der vorhandene Kurs genauso, wird auch der
 * Titel unterscheidbar gemacht („Kurs (2)“).
 */
export function withFreshIds(courses: Course[], existing: Pick<Course, 'id' | 'title'>[]): Course[] {
  const takenIds = new Set(existing.map((c) => c.id))
  const takenTitles = new Set(existing.map((c) => c.title))
  return courses.map((course) => {
    if (!takenIds.has(course.id)) {
      takenIds.add(course.id)
      takenTitles.add(course.title)
      return course
    }
    const id = uniqueId(course.id, takenIds)
    let title = course.title
    for (let n = 2; takenTitles.has(title); n++) title = `${course.title} (${n})`
    takenIds.add(id)
    takenTitles.add(title)
    return { ...course, id, title }
  })
}
