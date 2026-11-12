// Tests für den Kurs-Import. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractJson, parseCourses, slugify, uniqueId, withFreshIds } from './importer.ts'

const lesson = (extra: object = {}) => ({
  id: 'l1',
  title: 'Erste Lektion',
  steps: [
    { type: 'text', title: 'Start', text: 'Absatz eins.\n\nAbsatz zwei.' },
    { type: 'choice', question: 'Welche?', options: ['A', 'B', 'C'], answer: 2, explanation: 'Weil C.' },
    { type: 'truefalse', statement: 'Stimmt das?', answer: false },
  ],
  ...extra,
})

const course = (extra: object = {}) => ({
  id: 'test-kurs',
  title: 'Testkurs',
  emoji: '🧪',
  description: 'Zum Testen.',
  lessons: [lesson()],
  ...extra,
})

const json = (value: unknown) => JSON.stringify(value, null, 2)

function errorsOf(raw: string): string[] {
  const result = parseCourses(raw)
  assert.equal(result.ok, false, 'Import hätte fehlschlagen sollen')
  return result.ok ? [] : result.errors
}

describe('JSON aus eingefügtem Text holen', () => {
  it('entfernt ```json-Rahmen', () => {
    assert.equal(extractJson('```json\n{"a":1}\n```'), '{"a":1}')
    assert.equal(extractJson('```\n[1]\n```'), '[1]')
  })

  it('entfernt Begleittext von Claude', () => {
    assert.equal(extractJson('Hier ist dein Kurs:\n\n{"a":1}\n\nViel Spaß!'), '{"a":1}')
    assert.equal(extractJson('Klar!\n```json\n{"a":1}\n```\nNoch Fragen?'), '{"a":1}')
  })

  it('verkraftet einen fehlenden schließenden Rahmen', () => {
    assert.equal(extractJson('```json\n{"a":1}'), '{"a":1}')
  })

  it('lässt sich von einem im Text erwähnten ```json nicht irritieren', () => {
    const answer = 'Hier als ```json-Block:\n\n```json\n{"a":1}\n```'
    assert.equal(extractJson(answer), '{"a":1}')
  })

  it('entfernt ein unsichtbares BOM-Zeichen am Anfang', () => {
    assert.equal(extractJson('\uFEFF{"a":1}'), '{"a":1}')
  })
})

describe('Gültige Kurse importieren', () => {
  it('liest einen einzelnen Kurs', () => {
    const result = parseCourses(json(course()))
    assert.ok(result.ok)
    assert.equal(result.courses.length, 1)
    assert.equal(result.courses[0].title, 'Testkurs')
    assert.equal(result.courses[0].lessons[0].steps.length, 3)
    assert.deepEqual(result.notes, [])
  })

  it('liest eine Liste von Kursen und { "courses": [...] }', () => {
    const list = parseCourses(json([course(), course({ id: 'zweiter' })]))
    assert.ok(list.ok)
    assert.equal(list.courses.length, 2)
    const wrapped = parseCourses(json({ courses: [course()] }))
    assert.ok(wrapped.ok)
  })

  it('akzeptiert eingefügten Text mit ```json-Rahmen', () => {
    assert.ok(parseCourses('Bitte schön:\n```json\n' + json(course()) + '\n```').ok)
  })

  it('ergänzt fehlende Lektions-IDs aus dem Titel', () => {
    const result = parseCourses(
      json(
        course({
          lessons: [
            lesson({ id: undefined, title: 'Über das Gedächtnis' }),
            lesson({ id: undefined, title: 'Über das Gedächtnis' }),
            lesson({ id: undefined, title: 'Dritte' }),
          ],
        }),
      ),
    )
    assert.ok(result.ok)
    assert.deepEqual(
      result.courses[0].lessons.map((l) => l.id),
      ['ueber-das-gedaechtnis', 'ueber-das-gedaechtnis-2', 'dritte'],
    )
    assert.match(result.notes[0], /3 fehlende Lektions-IDs/)
  })

  it('ergänzt eine fehlende Kurs-ID aus dem Titel', () => {
    const result = parseCourses(json(course({ id: undefined, title: 'Grüne Pflanzen' })))
    assert.ok(result.ok)
    assert.equal(result.courses[0].id, 'gruene-pflanzen')
    assert.match(result.notes[0], /Keine ID angegeben/)
  })

  it('übernimmt nur bekannte Felder und schneidet Leerzeichen ab', () => {
    const result = parseCourses(json(course({ title: '  Testkurs  ', extra: 'ignoriert' })))
    assert.ok(result.ok)
    assert.equal(result.courses[0].title, 'Testkurs')
    assert.equal('extra' in result.courses[0], false)
  })
})

describe('Fehler verständlich melden', () => {
  it('meldet ungültiges JSON mit Zeile und Tipp zum Komma', () => {
    const errors = errorsOf('{\n  "id": "x",\n  "title": "T",\n}')
    assert.match(errors[0], /nicht gültig/)
    assert.ok(errors.some((e) => /kein Komma/.test(e)), errors.join('\n'))
  })

  it('erkennt typografische Anführungszeichen', () => {
    const errors = errorsOf('{ „id“: „x“ }')
    assert.ok(errors.some((e) => /typografische/.test(e)), errors.join('\n'))
  })

  it('nennt Kurs, Lektion und Schritt beim Fehler', () => {
    const bad = course({
      lessons: [
        lesson(),
        lesson({
          id: 'l2',
          title: 'Zweite Lektion',
          steps: [
            { type: 'text', text: 'Ok.' },
            { type: 'choice', question: 'Welche?', options: ['A', 'B', 'C', 'D'], answer: 4 },
          ],
        }),
      ],
    })
    const errors = errorsOf(json(bad))
    assert.equal(errors.length, 1)
    assert.match(errors[0], /Kurs \(„Testkurs“\) › Lektion 2 \(„Zweite Lektion“\) › Schritt 2 \(Frage\)/)
    assert.match(errors[0], /„answer“ ist 4, erlaubt sind aber nur 0 bis 3/)
  })

  it('sammelt mehrere Fehler auf einmal', () => {
    const bad = course({
      title: '',
      lessons: [
        lesson({
          steps: [
            { type: 'text', text: '' },
            { type: 'quiz', question: 'x' },
            { type: 'truefalse', statement: 'S', answer: 'true' },
            { question: 'ohne Typ' },
          ],
        }),
      ],
    })
    const errors = errorsOf(json(bad))
    assert.ok(errors.some((e) => /Titel \(„title“\) fehlt/.test(e)))
    assert.ok(errors.some((e) => /Schritt 1 \(Text\): Der Lesetext/.test(e)))
    assert.ok(errors.some((e) => /Unbekannter Typ „quiz“/.test(e)))
    assert.ok(errors.some((e) => /true oder false sein – ohne Anführungszeichen/.test(e)))
    assert.ok(errors.some((e) => /Schritt 4: Die Angabe „type“ fehlt/.test(e)))
  })

  it('verlangt mindestens 2 Antworten und gültige Listen', () => {
    const errors = errorsOf(
      json(course({ lessons: [lesson({ steps: [{ type: 'choice', question: 'F?', options: ['nur eine'], answer: 0 }] })] })),
    )
    assert.match(errors[0], /mindestens 2 Antworten/)
    assert.match(errorsOf(json(course({ lessons: [] })))[0], /mindestens einer Lektion/)
    assert.match(errorsOf(json(course({ lessons: [lesson({ steps: [] })] })))[0], /mindestens einem Schritt/)
  })

  it('meldet doppelte IDs', () => {
    assert.match(errorsOf(json([course(), course()]))[0], /mehrfach vor/)
    const twice = course({ lessons: [lesson(), lesson()] })
    assert.match(errorsOf(json(twice))[0], /Lektions-ID „l1“ kommt in diesem Kurs mehrfach vor/)
  })

  it('meldet leere Eingabe und falsche Grundform', () => {
    assert.match(errorsOf('   ')[0], /nichts eingefügt/)
    assert.match(errorsOf('42')[0], /Erwartet wird ein Kurs/)
    assert.match(errorsOf('[]')[0], /keinen Kurs/)
  })
})

describe('IDs', () => {
  it('erzeugt lesbare IDs aus Titeln', () => {
    assert.equal(slugify('Über das Gedächtnis!'), 'ueber-das-gedaechtnis')
    assert.equal(slugify('  Café & Straße  '), 'cafe-strasse')
    assert.equal(slugify('???'), '')
  })

  it('findet freie IDs', () => {
    assert.equal(uniqueId('kurs', new Set()), 'kurs')
    assert.equal(uniqueId('kurs', new Set(['kurs', 'kurs-2'])), 'kurs-3')
  })

  it('vergibt bei „Als neuen Kurs hinzufügen“ neue IDs', () => {
    const result = parseCourses(json([course(), course({ id: 'neu' })]))
    assert.ok(result.ok)
    const existing = [
      { id: 'test-kurs', title: 'Testkurs' },
      { id: 'lernen-lernen', title: 'Lernen lernen' },
    ]
    const renamed = withFreshIds(result.courses, existing)
    assert.deepEqual(
      renamed.map((c) => [c.id, c.title]),
      [
        ['test-kurs-2', 'Testkurs (2)'],
        ['neu', 'Testkurs'],
      ],
    )
  })
})

describe('Vorlage für Claude', () => {
  it('enthält ein Beispiel, das sich fehlerfrei importieren lässt', async () => {
    const { claudeTemplate } = await import('../content/claude-template.ts')
    const result = parseCourses(claudeTemplate(new Date(2026, 10, 12)))
    assert.ok(result.ok, result.ok ? '' : result.errors.join('\n'))
    assert.equal(result.courses[0].id, 'thema-20261112')
    assert.equal(result.courses[0].lessons[0].steps.length, 4)
  })
})
