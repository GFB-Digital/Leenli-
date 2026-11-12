// Speed-Reader-Logik (RSVP = Rapid Serial Visual Presentation)
//
// Nur reine Funktionen ohne Bildschirm-Zugriff → einfach zu testen
// (siehe orp.test.ts, Aufruf: npm test).

import { paragraphs } from './model.ts'

export type Pause = 'none' | 'clause' | 'sentence'

export interface Token {
  /** Wort so, wie es angezeigt wird (inkl. Satzzeichen und Anführungszeichen) */
  text: string
  /** Teil vor dem Fokusbuchstaben */
  before: string
  /** Der rote Fokusbuchstabe (genau ein Zeichen bzw. Graphem) */
  focus: string
  /** Teil nach dem Fokusbuchstaben */
  after: string
  /** Anzahl Buchstaben und Ziffern – Satzzeichen zählen nicht */
  letters: number
  /** Pause nach dem Wort: Satzende, Teilsatz (Komma usw.) oder keine */
  pause: Pause
  /** Erstes Wort eines Satzes (Ziel für „Satz zurück“) */
  sentenceStart: boolean
  /** Letztes Wort eines Absatzes */
  paragraphEnd: boolean
  /** Nummer des Absatzes (ab 0) */
  paragraph: number
}

// ---------------------------------------------------------------------------
// Zeichen: Umlaute, Akzente, Emojis korrekt als ein Zeichen behandeln

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('de', { granularity: 'grapheme' })
    : null

/** Zerlegt Text in sichtbare Zeichen (Grapheme), z. B. „Ä“ aus A + ¨ als ein Zeichen */
export function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text)
}

const LETTER = /[\p{L}\p{N}]/u

function isLetter(grapheme: string): boolean {
  return LETTER.test(grapheme)
}

// ---------------------------------------------------------------------------
// Fokusbuchstabe (ORP = Optimal Recognition Point)

/** Welcher Buchstabe (ab 1 gezählt) bei dieser Wortlänge rot wird */
export function focusLetterNumber(letters: number): number {
  if (letters <= 1) return 1
  if (letters <= 5) return 2
  if (letters <= 9) return 3
  if (letters <= 13) return 4
  return 5
}

/** Teilt ein Wort in „vor“, „Fokus“, „nach“ – Satzzeichen werden angezeigt, aber nicht gezählt */
export function splitWord(word: string): Pick<Token, 'before' | 'focus' | 'after' | 'letters'> {
  const chars = graphemes(word)
  const letterPositions = chars.flatMap((char, i) => (isLetter(char) ? [i] : []))

  if (letterPositions.length === 0) {
    // Keine Buchstaben (z. B. ein Emoji): erstes Zeichen als Fokus
    return { before: '', focus: chars[0] ?? '', after: chars.slice(1).join(''), letters: 0 }
  }

  const position = letterPositions[focusLetterNumber(letterPositions.length) - 1]
  return {
    before: chars.slice(0, position).join(''),
    focus: chars[position],
    after: chars.slice(position + 1).join(''),
    letters: letterPositions.length,
  }
}

// ---------------------------------------------------------------------------
// Pausen nach Satzzeichen

/** Schließende Anführungszeichen und Klammern hinter einem Satzzeichen */
const TRAILING_CLOSERS = /[\p{Pe}\p{Pf}"'“”‘’»«›‹]+$/u
const LEADING_OPENERS = /^[\p{Ps}\p{Pi}"'„“‚‘»«›‹]+/u

/** Abkürzungen, deren Punkt kein Satzende ist */
const ABBREVIATIONS = new Set([
  'abb.', 'bspw.', 'bzgl.', 'bzw.', 'ca.', 'd.h.', 'dr.', 'ebd.', 'etc.', 'evtl.', 'ggf.',
  'inkl.', 'jh.', 'kap.', 'max.', 'min.', 'mind.', 'mio.', 'mrd.', 'nr.', 'o.ä.', 'prof.',
  's.o.', 's.u.', 'sog.', 'st.', 'u.a.', 'u.ä.', 'usw.', 'v.a.', 'vgl.', 'vs.', 'z.b.',
  'z.t.', 'e.g.', 'i.e.', 'mr.', 'mrs.', 'ms.',
])

function isAbbreviation(core: string): boolean {
  const word = core.replace(LEADING_OPENERS, '').toLowerCase()
  if (ABBREVIATIONS.has(word)) return true
  // Einzelbuchstabe mit Punkt: Initialen („H. Ebbinghaus“) oder Teil von „z. B.“
  if (/^\p{L}\.$/u.test(word)) return true
  // Ordnungszahl: „11. November“, „1. Lektion“
  if (/^\d+\.$/.test(word)) return true
  return false
}

/** Welche Pause nach diesem Wort folgt */
export function pauseAfter(word: string): Pause {
  const core = word.replace(TRAILING_CLOSERS, '')
  if (/[.!?…]$/u.test(core)) {
    if (/[!?…]$/u.test(core) || /\.\.\.$/.test(core)) return 'sentence'
    return isAbbreviation(core) ? 'none' : 'sentence'
  }
  if (/[,;:–—]$/u.test(core) || /\s-$/.test(core)) return 'clause'
  return 'none'
}

// ---------------------------------------------------------------------------
// Text → Wörter

/** Steht ein „Wort“ nur aus Satzzeichen (z. B. ein Gedankenstrich), wird es angehängt */
const ONLY_PUNCTUATION = /^\p{P}+$/u

/** Bindestrich zwischen zwei Buchstaben/Ziffern (nicht der geschützte Bindestrich U+2011) */
const COMPOUND_HYPHEN = /(?<=[\p{L}\p{N}])[-\u2010](?=[\p{L}\p{N}])/u

/** Mindestzahl Buchstaben pro Teil – kürzere Teile bleiben angehängt („E-Mail“) */
const MIN_PART_LETTERS = 3

function countLetters(text: string): number {
  return graphemes(text).filter(isLetter).length
}

/**
 * Teilt Bindestrich-Wörter in einzelne Anzeigewörter, damit der Reader nicht
 * überladen wirkt: „Wiederlese-Gruppe“ → „Wiederlese-“, „Gruppe“.
 * Sehr kurze Teile bleiben verbunden: „E-Mail-Adresse“ → „E-Mail-“, „Adresse“.
 */
export function splitCompound(word: string): string[] {
  const pieces = word.split(COMPOUND_HYPHEN)
  if (pieces.length === 1) return [word]
  // Bindestrich wieder an die Teile hängen (außer beim letzten)
  const hyphens = word.match(new RegExp(COMPOUND_HYPHEN.source, 'gu')) ?? []
  const parts = pieces.map((piece, i) => piece + (hyphens[i] ?? ''))

  const result: string[] = []
  let current = ''
  for (const part of parts) {
    current += part
    if (countLetters(current) >= MIN_PART_LETTERS) {
      result.push(current)
      current = ''
    }
  }
  if (current) {
    // Zu kurzer Rest → an den vorherigen Teil hängen
    if (result.length > 0) result[result.length - 1] += current
    else result.push(current)
  }
  return result
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []

  // **fett**-Markierungen gehören nicht zum Lesetext
  paragraphs(text.replace(/\*\*/g, '')).forEach((paragraph, paragraphIndex) => {
    const words: string[] = []
    let pending = '' // Satzzeichen am Absatzanfang, z. B. ein einzelnes „–“
    for (const raw of paragraph.split(/\s+/)) {
      if (!raw) continue
      if (ONLY_PUNCTUATION.test(raw)) {
        if (words.length > 0) words[words.length - 1] += ` ${raw}`
        else pending = pending ? `${pending} ${raw}` : raw
      } else {
        const parts = splitCompound(raw)
        parts[0] = pending ? `${pending} ${parts[0]}` : parts[0]
        words.push(...parts)
        pending = ''
      }
    }
    if (pending) words.push(pending)

    words.forEach((word, i) => {
      const previous = tokens[tokens.length - 1]
      tokens.push({
        text: word,
        ...splitWord(word),
        pause: pauseAfter(word),
        sentenceStart:
          !previous || previous.pause === 'sentence' || previous.paragraphEnd,
        paragraphEnd: i === words.length - 1,
        paragraph: paragraphIndex,
      })
    })
  })

  return tokens
}

// ---------------------------------------------------------------------------
// Zeitsteuerung

export const TIMING = {
  minWpm: 100,
  maxWpm: 1000,
  wpmStep: 25,
  /** Satzende (. ! ? …) */
  sentence: 2.2,
  /** Komma, Doppelpunkt, Semikolon, Gedankenstrich */
  clause: 1.5,
  /** Zuschlag für Wörter mit mehr als 8 Buchstaben … */
  longWord: 0.3,
  longWordLetters: 8,
  /** … und noch einmal für mehr als 12 Buchstaben */
  veryLongWordLetters: 12,
  /** Absatzende: mindestens so lange */
  paragraphEnd: 2.8,
  /** Anlauf: die ersten Wörter nach dem Start langsamer */
  warmup: 1.6,
  warmupWords: 3,
} as const

/** Tempo auf den erlaubten Bereich (100–1000) und 25er-Schritte bringen */
export function clampWpm(wpm: number): number {
  if (!Number.isFinite(wpm)) return 300
  const stepped = Math.round(wpm / TIMING.wpmStep) * TIMING.wpmStep
  return Math.min(TIMING.maxWpm, Math.max(TIMING.minWpm, stepped))
}

/**
 * Anzeigedauer eines Wortes in Millisekunden.
 * Grundzeit 60000/WPM, multipliziert mit einem Faktor:
 * Satzende ×2,2 · Teilsatz ×1,5 · >8 Buchstaben +0,3 · >12 Buchstaben weitere +0,3 ·
 * Absatzende mindestens ×2,8 · Anlauf (erste Wörter nach dem Start) zusätzlich ×1,6
 */
export function wordDuration(token: Token, wpm: number, warmup = false): number {
  const base = 60000 / clampWpm(wpm)
  let factor = token.pause === 'sentence' ? TIMING.sentence : token.pause === 'clause' ? TIMING.clause : 1
  if (token.letters > TIMING.longWordLetters) factor += TIMING.longWord
  if (token.letters > TIMING.veryLongWordLetters) factor += TIMING.longWord
  if (token.paragraphEnd) factor = Math.max(factor, TIMING.paragraphEnd)
  if (warmup) factor *= TIMING.warmup
  return base * factor
}

/** Restzeit ab Wort `from` (einschließlich) bis zum Ende */
export function remainingMs(tokens: Token[], from: number, wpm: number): number {
  let total = 0
  for (let i = Math.max(0, from); i < tokens.length; i++) total += wordDuration(tokens[i], wpm)
  return total
}

/** „1:05“ – Minuten und Sekunden, aufgerundet */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Navigation

/** Anfang des Satzes, in dem Wort `index` steht */
export function sentenceStartOf(tokens: Token[], index: number): number {
  let i = Math.min(Math.max(0, index), tokens.length - 1)
  while (i > 0 && !tokens[i].sentenceStart) i--
  return Math.max(0, i)
}

/**
 * Ziel für „Satz zurück“: Mitten im Satz → an dessen Anfang.
 * Steht man schon am Satzanfang – oder wurde gerade erst zurückgesprungen
 * (`repeated`, zweimal kurz hintereinander gedrückt) → Anfang des vorherigen Satzes.
 */
export function sentenceBackTarget(tokens: Token[], index: number, repeated = false): number {
  if (tokens.length === 0) return 0
  const start = sentenceStartOf(tokens, index)
  if (index > start && !repeated) return start
  return start > 0 ? sentenceStartOf(tokens, start - 1) : 0
}
