// Import eigener Kurse: JSON lesen, gründlich prüfen, verständliche deutsche
// Fehlermeldungen erzeugen. Reine Funktionen → getestet in importer.test.ts.

import { COURSE_COLOR_NAMES, isCourseColor } from './colors.ts'
import type {
  BinaryStep,
  ChoiceStep,
  ClozeStep,
  Course,
  ImageRef,
  OrderStep,
  RecallStep,
  Step,
  TextStep,
  Tile,
  TrueFalseStep,
} from './types.ts'

export type ParseOutcome =
  | { ok: true; courses: Course[]; notes: string[] }
  | { ok: false; errors: string[] }

/** Mehr Fehler auf einmal zu zeigen wäre unübersichtlich */
export const MAX_ERRORS = 25

const STEP_TYPES = '"text", "choice", "binary", "truefalse", "cloze", "recall" oder "order"'

/** Ab so vielen Wörtern gibt es einen Hinweis, dass eine Leseseite lang ist */
export const LONG_PAGE_WORDS = 160

/** Lücke im Lückentext: drei oder mehr Unterstriche */
export const CLOZE_GAP = /_{3,}/

// ---------------------------------------------------------------------------
// Hilfsfunktionen

type Obj = Record<string, unknown>

function isObject(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === ''
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
  const text = raw.replace(/^\ufeff/, '').trim()

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

/** Prüft Felder eines Objekts und sammelt Fehler mit Ortsangabe */
function fields(value: Obj, where: string, ctx: Context) {
  return {
    required(key: string, label: string): string | null {
      const field = value[key]
      if (!isText(field)) {
        ctx.errors.push(`${where}: ${label} („${key}“) fehlt oder ist leer.`)
        return null
      }
      return field.trim()
    },
    optional(key: string): string | undefined {
      const field = value[key]
      if (isEmpty(field)) return undefined
      if (typeof field !== 'string') {
        ctx.errors.push(`${where}: „${key}“ muss ein Text sein.`)
        return undefined
      }
      return field.trim() || undefined
    },
    /** Liste kurzer Texte (für „intro“ und „recap“) */
    textList(key: string): string[] | undefined {
      const field = value[key]
      if (isEmpty(field)) return undefined
      if (!Array.isArray(field) || field.some((item) => !isText(item))) {
        ctx.errors.push(`${where}: „${key}“ muss eine Liste von Texten sein, z. B. ["…", "…"].`)
        return undefined
      }
      return field.length > 0 ? (field as string[]).map((item) => item.trim()) : undefined
    },
    /** Antwortmöglichkeiten + Index der richtigen */
    options(min: number, max: number, exact = false): { options: string[]; answer: number } | null {
      const options = value.options
      const count = exact ? `genau ${min}` : `${min} bis ${max}`
      if (!Array.isArray(options) || options.length < min || options.length > max) {
        ctx.errors.push(`${where}: „options“ muss eine Liste mit ${count} Antworten sein.`)
        return null
      }
      const bad = options.findIndex((option) => !isText(option))
      if (bad >= 0) {
        ctx.errors.push(`${where}: Antwort ${bad + 1} in „options“ ist leer oder kein Text.`)
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
      return { options: (options as string[]).map((option) => option.trim()), answer }
    },
  }
}

function validateImage(value: unknown, where: string, ctx: Context): ImageRef | undefined {
  if (isEmpty(value)) return undefined
  const image: Obj | null = typeof value === 'string' ? { src: value } : isObject(value) ? value : null
  if (!image || !isText(image.src)) {
    ctx.errors.push(`${where}: „image“ braucht eine Bildadresse in „src“.`)
    return undefined
  }
  const src = image.src.trim()
  if (!/^https:\/\//i.test(src) && !/^data:image\//i.test(src)) {
    ctx.errors.push(`${where}: Die Bildadresse muss mit https:// beginnen.`)
    return undefined
  }
  const result: ImageRef = { src }
  if (isText(image.alt)) result.alt = image.alt.trim()
  if (isText(image.credit)) result.credit = image.credit.trim()
  return result
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
  const f = fields(value, where, ctx)

  if (type === 'text') {
    const text = f.required('text', 'Der Lesetext')
    const title = f.optional('title')
    const image = validateImage(value.image, where, ctx)
    if (text === null) return null
    const step: TextStep = { type, text }
    if (title) step.title = title
    if (image) step.image = image
    return step
  }

  if (type === 'choice') {
    const question = f.required('question', 'Die Frage')
    const explanation = f.optional('explanation')
    const choice = f.options(2, 6)
    if (question === null || !choice) return null
    const step: ChoiceStep = { type, question, ...choice }
    if (explanation) step.explanation = explanation
    return step
  }

  if (type === 'binary') {
    const question = f.required('question', 'Die Frage')
    const explanation = f.optional('explanation')
    const choice = f.options(2, 2, true)
    if (question === null || !choice) return null
    const step: BinaryStep = {
      type,
      question,
      options: [choice.options[0], choice.options[1]],
      answer: choice.answer === 1 ? 1 : 0,
    }
    if (explanation) step.explanation = explanation
    return step
  }

  if (type === 'truefalse') {
    const statement = f.required('statement', 'Die Aussage')
    const explanation = f.optional('explanation')
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

  if (type === 'cloze') {
    const text = f.required('text', 'Der Lückentext')
    const explanation = f.optional('explanation')
    const choice = f.options(2, 6)
    if (text !== null) {
      const gaps = text.match(new RegExp(CLOZE_GAP.source, 'g'))?.length ?? 0
      if (gaps !== 1) {
        ctx.errors.push(`${where}: Der Lückentext braucht genau eine Lücke „___“ (gefunden: ${gaps}).`)
        return null
      }
    }
    if (text === null || !choice) return null
    const step: ClozeStep = { type, text, ...choice }
    if (explanation) step.explanation = explanation
    return step
  }

  if (type === 'recall') {
    const question = f.required('question', 'Die Frage')
    const answer = typeof value.answer === 'number' ? String(value.answer) : f.required('answer', 'Die Antwort')
    const explanation = f.optional('explanation')
    if (question === null || answer === null) return null
    const step: RecallStep = { type, question, answer }
    if (explanation) step.explanation = explanation
    return step
  }

  if (type === 'order') {
    const question = f.required('question', 'Die Frage')
    const explanation = f.optional('explanation')
    const items = value.items
    if (!Array.isArray(items) || items.length < 3 || items.length > 6) {
      ctx.errors.push(`${where}: „items“ muss eine Liste mit 3 bis 6 Einträgen in der richtigen Reihenfolge sein.`)
      return null
    }
    const bad = items.findIndex((item) => !isText(item))
    if (bad >= 0) {
      ctx.errors.push(`${where}: Eintrag ${bad + 1} in „items“ ist leer oder kein Text.`)
      return null
    }
    const clean = (items as string[]).map((item) => item.trim())
    if (new Set(clean).size !== clean.length) {
      ctx.errors.push(`${where}: In „items“ kommt ein Eintrag doppelt vor – die Reihenfolge wäre nicht eindeutig.`)
      return null
    }
    if (question === null) return null
    const step: OrderStep = { type, question, items: clean }
    if (explanation) step.explanation = explanation
    return step
  }

  ctx.errors.push(`${where}: Unbekannter Typ „${String(type)}“. Erlaubt sind ${STEP_TYPES}.`)
  return null
}

function validateTile(
  value: unknown,
  index: number,
  courseLabel: string,
  takenIds: Set<string>,
  ctx: Context,
): { tile: Tile | null; generatedId: boolean } {
  const where = `${courseLabel} › ${titled(`Kachel ${index + 1}`, isObject(value) ? value.title : undefined)}`
  if (!isObject(value)) {
    ctx.errors.push(`${where}: Erwartet wird ein Objekt { … }.`)
    return { tile: null, generatedId: false }
  }
  const f = fields(value, where, ctx)
  const title = f.required('title', 'Der Titel')
  const emoji = f.optional('emoji')
  const intro = f.textList('intro')
  const recap = f.textList('recap')

  let id: string | null = null
  let generatedId = false
  if (isEmpty(value.id)) {
    id = uniqueId(slugify(title ?? '') || `kachel-${index + 1}`, takenIds)
    generatedId = true
  } else if (isText(value.id) || typeof value.id === 'number') {
    id = String(value.id).trim()
    if (takenIds.has(id)) {
      ctx.errors.push(`${where}: Die Kachel-ID „${id}“ kommt in diesem Kurs mehrfach vor.`)
    }
  } else {
    ctx.errors.push(`${where}: „id“ muss ein Text sein.`)
  }
  if (id) takenIds.add(id)

  const steps = value.steps
  if (!Array.isArray(steps) || steps.length === 0) {
    ctx.errors.push(`${where}: „steps“ muss eine Liste mit mindestens einem Schritt sein.`)
    return { tile: null, generatedId }
  }

  const checked = steps.map((step, k) => {
    const kind = isObject(step) ? (step.type === 'text' ? 'Seite' : step.type ? 'Frage' : '') : ''
    return validateStep(step, `${where} › Schritt ${k + 1}${kind ? ` (${kind})` : ''}`, ctx)
  })

  if (!title || !id || checked.some((step) => step === null)) return { tile: null, generatedId }
  const tile: Tile = { id, title, steps: checked as Step[] }
  if (emoji) tile.emoji = emoji
  if (intro) tile.intro = intro
  if (recap) tile.recap = recap
  return { tile, generatedId }
}

function validateCourse(value: unknown, index: number, total: number, ctx: Context): Course | null {
  const base = total > 1 ? `Kurs ${index + 1}` : 'Kurs'
  const label = titled(base, isObject(value) ? value.title : undefined)
  if (!isObject(value)) {
    ctx.errors.push(`${label}: Erwartet wird ein Objekt { … }.`)
    return null
  }
  const f = fields(value, label, ctx)
  const title = f.required('title', 'Der Titel')
  const emoji = f.optional('emoji')
  const description = f.optional('description')
  const group = f.optional('group')

  let color = f.optional('color')
  if (color && !isCourseColor(color)) {
    ctx.errors.push(`${label}: Unbekannte Farbe „${color}“. Erlaubt: ${COURSE_COLOR_NAMES.join(', ')}.`)
    color = undefined
  }

  let id: string | null = null
  if (isEmpty(value.id)) {
    id = slugify(title ?? '') || 'kurs'
    ctx.notes.push(`${label}: Keine ID angegeben – „${id}“ wird verwendet.`)
  } else if (isText(value.id) || typeof value.id === 'number') {
    id = String(value.id).trim()
  } else {
    ctx.errors.push(`${label}: „id“ muss ein Text sein.`)
  }

  // Ältere Kurse heißen „lessons“ statt „tiles“ – beides wird angenommen
  const tiles = value.tiles ?? value.lessons
  if (!Array.isArray(tiles) || tiles.length === 0) {
    ctx.errors.push(`${label}: „tiles“ muss eine Liste mit mindestens einer Kachel sein.`)
    return null
  }

  const takenTileIds = new Set<string>()
  let generated = 0
  const checked = tiles.map((tile, j) => {
    const result = validateTile(tile, j, label, takenTileIds, ctx)
    if (result.generatedId) generated++
    return result.tile
  })
  if (generated > 0) {
    ctx.notes.push(
      generated === 1
        ? `${label}: 1 fehlende Kachel-ID wurde ergänzt.`
        : `${label}: ${generated} fehlende Kachel-IDs wurden ergänzt.`,
    )
  }

  if (!title || !id || checked.some((tile) => tile === null)) return null
  const course: Course = { id, title, tiles: checked as Tile[] }
  if (emoji) course.emoji = emoji
  if (description) course.description = description
  if (color) course.color = color
  if (group) course.group = group
  ctx.notes.push(...contentHints(course, label))
  return course
}

/**
 * Hinweise zum Inhalt – kein Fehler, der Kurs wird trotzdem importiert:
 * sehr lange Leseseiten und Kacheln ohne Frage (die lassen sich nicht wiederholen).
 */
export function contentHints(course: Course, label = 'Kurs'): string[] {
  const hints: string[] = []
  const long: string[] = []
  const unasked: string[] = []
  for (const tile of course.tiles) {
    let page = 0
    for (const step of tile.steps) {
      if (step.type !== 'text') continue
      page++
      const words = step.text.split(/\s+/).filter(Boolean).length
      if (words > LONG_PAGE_WORDS) long.push(`„${shorten(tile.title, 30)}“, Seite ${page} (${words} Wörter)`)
    }
    if (tile.steps.every((step) => step.type === 'text')) unasked.push(`„${shorten(tile.title, 30)}“`)
  }
  const list = (items: string[]) => (items.length > 3 ? `${items.slice(0, 3).join(', ')} und ${items.length - 3} weitere` : items.join(', '))
  if (long.length > 0) {
    hints.push(
      `${label}: ${long.length === 1 ? '1 Seite ist' : `${long.length} Seiten sind`} länger als ${LONG_PAGE_WORDS} Wörter – kürzere Seiten lernen sich leichter: ${list(long)}.`,
    )
  }
  if (unasked.length > 0) {
    hints.push(
      `${label}: ${unasked.length === 1 ? '1 Kachel hat' : `${unasked.length} Kacheln haben`} keine Frage und ${unasked.length === 1 ? 'kann' : 'können'} deshalb nicht wiederholt werden: ${list(unasked)}.`,
    )
  }
  return hints
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
  return validateCourses(data)
}

/** Prüft bereits gelesene Daten (auch für gespeicherte Kurse älteren Formats) */
export function validateCourses(data: unknown): ParseOutcome {
  const list = Array.isArray(data)
    ? data
    : isObject(data) && Array.isArray(data.courses)
      ? data.courses
      : isObject(data)
        ? [data]
        : null
  if (!list) {
    return { ok: false, errors: ['Erwartet wird ein Kurs { … } oder eine Liste von Kursen [ … ].'] }
  }
  if (list.length === 0) return { ok: false, errors: ['Die Liste enthält keinen Kurs.'] }

  const ctx: Context = { errors: [], notes: [] }
  const courses: Course[] = []
  const seen = new Set<string>()
  list.forEach((value, i) => {
    const course = validateCourse(value, i, list.length, ctx)
    if (!course) return
    if (seen.has(course.id)) {
      ctx.errors.push(
        `${titled(`Kurs ${i + 1}`, course.title)}: Die ID „${course.id}“ kommt in diesem Import mehrfach vor.`,
      )
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
