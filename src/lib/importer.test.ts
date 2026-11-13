// Tests für den Kurs-Import. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractJson, parseCourses, slugify, uniqueId, withFreshIds } from './importer.ts'

const tile = (extra: object = {}) => ({
  id: 't1',
  title: 'Erste Kachel',
  intro: ['Was ist X?', 'Wer fand X?'],
  steps: [
    { type: 'text', title: 'Start', text: 'Absatz eins.\n\nAbsatz **zwei**.' },
    { type: 'choice', question: 'Welche?', options: ['A', 'B', 'C'], answer: 2, explanation: 'Weil C.' },
    { type: 'binary', question: 'Oben oder unten?', options: ['Oben', 'Unten'], answer: 1 },
    { type: 'truefalse', statement: 'Stimmt das?', answer: false },
    { type: 'cloze', text: 'Die ___ ist rund.', options: ['Erde', 'Scheibe'], answer: 0 },
  ],
  recap: ['X ist wichtig.'],
  ...extra,
})

const course = (extra: object = {}) => ({
  id: 'test-kurs',
  title: 'Testkurs',
  emoji: '🧪',
  description: 'Zum Testen.',
  color: 'gruen',
  tiles: [tile()],
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
    assert.equal(extractJson('Hier als ```json-Block:\n\n```json\n{"a":1}\n```'), '{"a":1}')
  })

  it('entfernt ein unsichtbares BOM-Zeichen am Anfang', () => {
    assert.equal(extractJson(String.fromCharCode(0xfeff) + '{"a":1}'), '{"a":1}')
  })
})

describe('Gültige Kurse importieren', () => {
  it('liest einen Kurs mit allen Fragetypen, Einleitung und Rückblick', () => {
    const result = parseCourses(json(course()))
    assert.ok(result.ok, result.ok ? '' : result.errors.join('\n'))
    const t = result.courses[0].tiles[0]
    assert.equal(result.courses[0].color, 'gruen')
    assert.deepEqual(t.intro, ['Was ist X?', 'Wer fand X?'])
    assert.deepEqual(t.recap, ['X ist wichtig.'])
    assert.deepEqual(
      t.steps.map((s) => s.type),
      ['text', 'choice', 'binary', 'truefalse', 'cloze'],
    )
    assert.deepEqual(result.notes, [])
  })

  it('liest Karteikarte, Reihenfolge und Themengebiet', () => {
    const steps = [
      { type: 'text', text: 'Seite.' },
      { type: 'recall', question: ' Warum ist der Himmel blau? ', answer: 'Weil kurzwelliges Licht stärker gestreut wird.', explanation: 'Rayleigh-Streuung.' },
      { type: 'recall', question: 'Wie viele Seiten hat ein Sechseck?', answer: 6 },
      { type: 'order', question: 'Vom Rohteil zum Fertigteil:', items: ['Gießen', ' Entgraten ', 'Schleifen'] },
    ]
    const result = parseCourses(json(course({ group: ' Fertigung ', tiles: [tile({ steps })] })))
    assert.ok(result.ok, result.ok ? '' : result.errors.join('\n'))
    assert.equal(result.courses[0].group, 'Fertigung')
    const [, recall, numeric, order] = result.courses[0].tiles[0].steps
    assert.deepEqual(recall, {
      type: 'recall',
      question: 'Warum ist der Himmel blau?',
      answer: 'Weil kurzwelliges Licht stärker gestreut wird.',
      explanation: 'Rayleigh-Streuung.',
    })
    assert.deepEqual(numeric, { type: 'recall', question: 'Wie viele Seiten hat ein Sechseck?', answer: '6' })
    assert.deepEqual(order, { type: 'order', question: 'Vom Rohteil zum Fertigteil:', items: ['Gießen', 'Entgraten', 'Schleifen'] })
  })

  it('gibt Hinweise zu langen Seiten und Kacheln ohne Frage, importiert aber trotzdem', () => {
    const long = Array.from({ length: 200 }, (_, i) => `Wort${i}`).join(' ')
    const tiles = [
      tile({ id: 'a', title: 'Mit langer Seite', steps: [{ type: 'text', text: 'Kurz.' }, { type: 'text', text: long }, { type: 'truefalse', statement: 'S', answer: true }] }),
      tile({ id: 'b', title: 'Nur zum Lesen', steps: [{ type: 'text', text: 'Nur Text.' }] }),
    ]
    const result = parseCourses(json(course({ tiles })))
    assert.ok(result.ok)
    assert.equal(result.notes.length, 2)
    assert.match(result.notes[0], /1 Seite ist länger als 160 Wörter.*„Mit langer Seite“, Seite 2 \(200 Wörter\)/)
    assert.match(result.notes[1], /1 Kachel hat keine Frage.*„Nur zum Lesen“/)
  })

  it('nimmt ältere Kurse mit „lessons“ an', () => {
    const old = { id: 'alt', title: 'Alt', lessons: [{ id: 'l1', title: 'L', steps: [{ type: 'text', text: 'T' }] }] }
    const result = parseCourses(json(old))
    assert.ok(result.ok)
    assert.equal(result.courses[0].tiles[0].id, 'l1')
  })

  it('liest Bilder als Objekt oder als einfache Adresse', () => {
    const steps = [
      { type: 'text', text: 'A', image: { src: 'https://example.org/a.jpg', credit: 'Bild: X' } },
      { type: 'text', text: 'B', image: 'https://example.org/b.jpg' },
    ]
    const result = parseCourses(json(course({ tiles: [tile({ steps })] })))
    assert.ok(result.ok)
    const [a, b] = result.courses[0].tiles[0].steps
    assert.deepEqual(a.type === 'text' && a.image, { src: 'https://example.org/a.jpg', credit: 'Bild: X' })
    assert.deepEqual(b.type === 'text' && b.image, { src: 'https://example.org/b.jpg' })
  })

  it('liest eine Liste von Kursen und { "courses": [...] }', () => {
    const list = parseCourses(json([course(), course({ id: 'zweiter' })]))
    assert.ok(list.ok)
    assert.equal(list.courses.length, 2)
    assert.ok(parseCourses(json({ courses: [course()] })).ok)
  })

  it('ergänzt fehlende Kachel-IDs aus dem Titel', () => {
    const result = parseCourses(
      json(
        course({
          tiles: [
            tile({ id: undefined, title: 'Über das Gedächtnis' }),
            tile({ id: undefined, title: 'Über das Gedächtnis' }),
            tile({ id: undefined, title: 'Dritte' }),
          ],
        }),
      ),
    )
    assert.ok(result.ok)
    assert.deepEqual(
      result.courses[0].tiles.map((t) => t.id),
      ['ueber-das-gedaechtnis', 'ueber-das-gedaechtnis-2', 'dritte'],
    )
    assert.match(result.notes[0], /3 fehlende Kachel-IDs/)
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
    assert.ok(errorsOf('{ „id“: „x“ }').some((e) => /typografische/.test(e)))
  })

  it('nennt Kurs, Kachel und Schritt beim Fehler', () => {
    const bad = course({
      tiles: [
        tile(),
        tile({
          id: 't2',
          title: 'Zweite Kachel',
          steps: [
            { type: 'text', text: 'Ok.' },
            { type: 'choice', question: 'Welche?', options: ['A', 'B', 'C', 'D'], answer: 4 },
          ],
        }),
      ],
    })
    const errors = errorsOf(json(bad))
    assert.equal(errors.length, 1)
    assert.match(errors[0], /Kurs \(„Testkurs“\) › Kachel 2 \(„Zweite Kachel“\) › Schritt 2 \(Frage\)/)
    assert.match(errors[0], /„answer“ ist 4, erlaubt sind aber nur 0 bis 3/)
  })

  it('sammelt mehrere Fehler auf einmal', () => {
    const bad = course({
      title: '',
      tiles: [
        tile({
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
    assert.ok(errors.some((e) => /Schritt 1 \(Seite\): Der Lesetext/.test(e)))
    assert.ok(errors.some((e) => /Unbekannter Typ „quiz“/.test(e)))
    assert.ok(errors.some((e) => /true oder false sein – ohne Anführungszeichen/.test(e)))
    assert.ok(errors.some((e) => /Schritt 4: Die Angabe „type“ fehlt/.test(e)))
  })

  it('prüft Karteikarte und Reihenfolge', () => {
    const steps = [
      { type: 'recall', question: 'Warum?' },
      { type: 'order', question: 'Ordne.', items: ['a', 'b'] },
      { type: 'order', question: 'Ordne.', items: ['a', 'b', 'a'] },
      { type: 'order', question: 'Ordne.', items: ['a', '', 'c'] },
    ]
    const errors = errorsOf(json(course({ tiles: [tile({ steps })] })))
    assert.ok(errors.some((e) => /Schritt 1 \(Frage\): Die Antwort \(„answer“\) fehlt/.test(e)), errors.join('\n'))
    assert.ok(errors.some((e) => /Schritt 2 \(Frage\): „items“ muss eine Liste mit 3 bis 6 Einträgen/.test(e)))
    assert.ok(errors.some((e) => /Schritt 3 \(Frage\): In „items“ kommt ein Eintrag doppelt vor/.test(e)))
    assert.ok(errors.some((e) => /Schritt 4 \(Frage\): Eintrag 2 in „items“ ist leer/.test(e)))
  })

  it('prüft Entweder-oder und Lückentext', () => {
    const steps = [
      { type: 'binary', question: 'F?', options: ['a', 'b', 'c'], answer: 0 },
      { type: 'cloze', text: 'Ohne Lücke.', options: ['a', 'b'], answer: 0 },
      { type: 'cloze', text: 'Zwei ___ und ___.', options: ['a', 'b'], answer: 0 },
    ]
    const errors = errorsOf(json(course({ tiles: [tile({ steps })] })))
    assert.ok(errors.some((e) => /genau 2 Antworten/.test(e)), errors.join('\n'))
    assert.ok(errors.some((e) => /genau eine Lücke „___“ \(gefunden: 0\)/.test(e)))
    assert.ok(errors.some((e) => /genau eine Lücke „___“ \(gefunden: 2\)/.test(e)))
  })

  it('prüft Bilder, Farben, Einleitung und Rückblick', () => {
    const bad = course({
      color: 'pink',
      tiles: [
        tile({
          intro: 'kein Array',
          recap: ['ok', ''],
          steps: [{ type: 'text', text: 'T', image: { src: 'http://unsicher.org/a.jpg' } }],
        }),
      ],
    })
    const errors = errorsOf(json(bad))
    assert.ok(errors.some((e) => /Unbekannte Farbe „pink“/.test(e)))
    assert.ok(errors.some((e) => /„intro“ muss eine Liste von Texten/.test(e)))
    assert.ok(errors.some((e) => /„recap“ muss eine Liste von Texten/.test(e)))
    assert.ok(errors.some((e) => /mit https:\/\/ beginnen/.test(e)))
  })

  it('verlangt gültige Listen', () => {
    const one = [{ type: 'choice', question: 'F?', options: ['nur eine'], answer: 0 }]
    assert.match(errorsOf(json(course({ tiles: [tile({ steps: one })] })))[0], /2 bis 6 Antworten/)
    assert.match(errorsOf(json(course({ tiles: [] })))[0], /mindestens einer Kachel/)
    assert.match(errorsOf(json(course({ tiles: [tile({ steps: [] })] })))[0], /mindestens einem Schritt/)
  })

  it('meldet doppelte IDs', () => {
    assert.match(errorsOf(json([course(), course()]))[0], /mehrfach vor/)
    assert.match(errorsOf(json(course({ tiles: [tile(), tile()] })))[0], /Kachel-ID „t1“ kommt in diesem Kurs mehrfach vor/)
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

  it('vergibt bei „Als neuen Kurs hinzufügen“ neue IDs und Titel', () => {
    const result = parseCourses(json([course(), course({ id: 'neu' })]))
    assert.ok(result.ok)
    const renamed = withFreshIds(result.courses, [
      { id: 'test-kurs', title: 'Testkurs' },
      { id: 'lernen-lernen', title: 'Lernen lernen' },
    ])
    assert.deepEqual(
      renamed.map((c) => [c.id, c.title]),
      [
        ['test-kurs-2', 'Testkurs (2)'],
        ['neu', 'Testkurs'],
      ],
    )
  })
})

describe('Mitgelieferte Inhalte', () => {
  it('Vorlage für Claude enthält ein fehlerfrei importierbares Beispiel', async () => {
    const { claudeTemplate } = await import('../content/claude-template.ts')
    const result = parseCourses(claudeTemplate(new Date(2026, 10, 12)))
    assert.ok(result.ok, result.ok ? '' : result.errors.join('\n'))
    assert.equal(result.courses[0].id, 'thema-20261112')
  })

  it('Beispielkurs ist im gültigen Format', async () => {
    const { SAMPLE_COURSE } = await import('../content/sample-course.ts')
    const result = parseCourses(JSON.stringify(SAMPLE_COURSE))
    assert.ok(result.ok, result.ok ? '' : result.errors.join('\n'))
  })
})
