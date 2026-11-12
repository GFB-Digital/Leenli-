// Tests für die Speed-Reader-Logik. Aufruf: npm test
// Nutzt den in Node.js eingebauten Test-Runner – keine zusätzliche Bibliothek nötig.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clampWpm,
  focusLetterNumber,
  formatDuration,
  graphemes,
  pauseAfter,
  remainingMs,
  sentenceBackTarget,
  splitCompound,
  splitWord,
  tokenize,
  wordDuration,
} from './orp.ts'

describe('Fokusbuchstabe nach Wortlänge', () => {
  it('folgt der Regel 1 → 1., 2–5 → 2., 6–9 → 3., 10–13 → 4., ab 14 → 5.', () => {
    const expected: [number, number][] = [
      [1, 1], [2, 2], [5, 2], [6, 3], [9, 3], [10, 4], [13, 4], [14, 5], [40, 5],
    ]
    for (const [letters, position] of expected) {
      assert.equal(focusLetterNumber(letters), position, `${letters} Buchstaben`)
    }
  })

  it('markiert den richtigen Buchstaben', () => {
    assert.deepEqual(splitWord('a'), { before: '', focus: 'a', after: '', letters: 1 })
    assert.deepEqual(splitWord('im'), { before: 'i', focus: 'm', after: '', letters: 2 })
    assert.deepEqual(splitWord('Hallo'), { before: 'H', focus: 'a', after: 'llo', letters: 5 })
    assert.deepEqual(splitWord('Lernen'), { before: 'Le', focus: 'r', after: 'nen', letters: 6 })
    assert.equal(splitWord('Wiederholung').focus, 'd') // 12 Buchstaben → 4.
    assert.equal(splitWord('Donaudampfschifffahrt').focus, 'u') // 21 → 5.
  })

  it('zählt Satzzeichen und Anführungszeichen nicht mit, zeigt sie aber an', () => {
    assert.deepEqual(splitWord('„Hallo,“'), {
      before: '„H',
      focus: 'a',
      after: 'llo,“',
      letters: 5,
    })
    assert.deepEqual(splitWord('(Lernen).'), {
      before: '(Le',
      focus: 'r',
      after: 'nen).',
      letters: 6,
    })
  })

  it('behandelt Umlaute und ß als normale Buchstaben', () => {
    assert.deepEqual(splitWord('Gedächtnis'), {
      before: 'Ged',
      focus: 'ä',
      after: 'chtnis',
      letters: 10,
    })
    assert.equal(splitWord('Übung').focus, 'b')
    assert.equal(splitWord('Fuß').focus, 'u')
  })

  it('hält zusammengesetzte Zeichen zusammen (A + ¨ = Ä)', () => {
    const decomposed = 'A\u0308rger' // „Ärger“ mit kombinierendem Umlaut
    assert.equal(graphemes(decomposed).length, 5)
    const parts = splitWord(decomposed)
    assert.equal(parts.before, 'A\u0308')
    assert.equal(parts.focus, 'r')
    assert.equal(parts.letters, 5)
  })

  it('kommt mit Zahlen und Emojis zurecht', () => {
    assert.equal(splitWord('1885').focus, '8')
    assert.deepEqual(splitWord('🧠'), { before: '', focus: '🧠', after: '', letters: 0 })
    assert.equal(splitWord('👩‍🔬').focus, '👩‍🔬') // ein Zeichen aus mehreren Teilen
  })

  it('setzt jedes Wort wieder vollständig zusammen', () => {
    const words = ['„Über', 'verfälscht.“', 'Wort…', 'E-Mail-Adresse', '–', '50 %', 'Ärger?!']
    for (const word of words) {
      const { before, focus, after } = splitWord(word)
      assert.equal(before + focus + after, word)
    }
  })
})

describe('Pausen nach Satzzeichen', () => {
  it('erkennt Satzenden', () => {
    for (const word of ['Ende.', 'wirklich?', 'so!', 'Hm…', 'warte...', 'Ärger?!']) {
      assert.equal(pauseAfter(word), 'sentence', word)
    }
  })

  it('berücksichtigt schließende Anführungszeichen hinter dem Satzzeichen', () => {
    assert.equal(pauseAfter('verfälscht.“'), 'sentence')
    assert.equal(pauseAfter('Gedächtnis“.'), 'sentence')
    assert.equal(pauseAfter('fragte?»'), 'sentence')
    assert.equal(pauseAfter('(Klammer).'), 'sentence')
    assert.equal(pauseAfter('„Zitat,“'), 'clause')
  })

  it('erkennt Teilsätze', () => {
    for (const word of ['Komma,', 'Semikolon;', 'Doppelpunkt:', 'Strich –', 'Strich —', 'so -']) {
      assert.equal(pauseAfter(word), 'clause', word)
    }
  })

  it('hält Abkürzungen, Initialen und Ordnungszahlen nicht für Satzenden', () => {
    for (const word of ['z.', 'B.', 'usw.', 'Dr.', 'bzw.', 'H.', '11.', 'z.B.', '(vgl.']) {
      assert.equal(pauseAfter(word), 'none', word)
    }
    assert.equal(pauseAfter('usw.,'), 'clause')
  })

  it('lässt normale Wörter ohne Pause', () => {
    for (const word of ['Haus', 'Vor-', 'E-Mail']) assert.equal(pauseAfter(word), 'none', word)
  })
})

describe('Text in Wörter zerlegen', () => {
  it('erkennt Satz- und Absatzanfänge', () => {
    const tokens = tokenize('Ein Satz. Noch einer!\n\nNeuer Absatz')
    assert.deepEqual(
      tokens.map((t) => [t.text, t.sentenceStart, t.paragraphEnd, t.paragraph]),
      [
        ['Ein', true, false, 0],
        ['Satz.', false, false, 0],
        ['Noch', true, false, 0],
        ['einer!', false, true, 0],
        ['Neuer', true, false, 1],
        ['Absatz', false, true, 1],
      ],
    )
  })

  it('hängt alleinstehende Satzzeichen an das vorherige Wort', () => {
    const tokens = tokenize('Erst das – dann jenes. Fertig …')
    assert.deepEqual(
      tokens.map((t) => t.text),
      ['Erst', 'das –', 'dann', 'jenes.', 'Fertig …'],
    )
    assert.equal(tokens[1].pause, 'clause')
  })

  it('trennt Bindestrich-Wörter in einzelne Anzeigewörter', () => {
    assert.deepEqual(splitCompound('Wiederlese-Gruppe'), ['Wiederlese-', 'Gruppe'])
    assert.deepEqual(splitCompound('Speed-Reader'), ['Speed-', 'Reader'])
    assert.deepEqual(splitCompound('1970er-Jahren'), ['1970er-', 'Jahren'])
    assert.deepEqual(splitCompound('„Speed-Reader“,'), ['„Speed-', 'Reader“,'])
  })

  it('lässt sehr kurze Teile verbunden', () => {
    assert.deepEqual(splitCompound('E-Mail'), ['E-Mail'])
    assert.deepEqual(splitCompound('E-Mail-Adresse'), ['E-Mail-', 'Adresse'])
    assert.deepEqual(splitCompound('Ad-hoc-Lösung'), ['Ad-hoc-', 'Lösung'])
    assert.deepEqual(splitCompound('Gruppe-B'), ['Gruppe-B'])
    assert.deepEqual(splitCompound('3-D'), ['3-D'])
  })

  it('trennt nicht an Bindestrichen am Wortrand oder am geschützten Bindestrich', () => {
    assert.deepEqual(splitCompound('Vor-'), ['Vor-'])
    assert.deepEqual(splitCompound('-los'), ['-los'])
    assert.deepEqual(splitCompound('Wiederlese\u2011Gruppe'), ['Wiederlese\u2011Gruppe'])
  })

  it('zeigt die Teile im Lesefluss nacheinander', () => {
    const tokens = tokenize('Die Wiederlese-Gruppe lag „leicht“ vorn.')
    assert.deepEqual(
      tokens.map((t) => t.text),
      ['Die', 'Wiederlese-', 'Gruppe', 'lag', '„leicht“', 'vorn.'],
    )
    assert.equal(tokens[1].pause, 'none')
    assert.equal(tokens[1].focus, 'd') // 10 Buchstaben → 4.
  })

  it('macht aus „z. B.“ keinen Satzanfang', () => {
    const tokens = tokenize('Etwa z. B. Vokabeln lernen.')
    assert.equal(tokens.find((t) => t.text === 'Vokabeln')?.sentenceStart, false)
  })

  it('verkraftet leeren Text und überflüssige Leerzeichen', () => {
    assert.deepEqual(tokenize(''), [])
    assert.deepEqual(tokenize('  \n\n  ').length, 0)
    assert.equal(tokenize('  Wort   für  Wort ').length, 3)
  })
})

describe('Anzeigedauer', () => {
  const at = (text: string) => tokenize(text)
  // 300 WpM → Grundzeit 200 ms

  it('nutzt 60000/WPM als Grundzeit', () => {
    assert.equal(wordDuration(at('und so')[0], 300), 200)
    assert.equal(wordDuration(at('und so')[0], 600), 100)
  })

  it('verlängert Satzende (×2,2) und Teilsatz (×1,5)', () => {
    assert.ok(Math.abs(wordDuration(at('Satz. Weiter')[0], 300) - 440) < 1e-9)
    assert.equal(wordDuration(at('Komma, weiter')[0], 300), 300)
  })

  it('gibt langen Wörtern Zuschlag (+0,3 ab 9 und weitere +0,3 ab 13 Buchstaben)', () => {
    assert.equal(wordDuration(at('Achtbuchs x')[0], 300), 260) // 9 Buchstaben
    assert.equal(wordDuration(at('achtbuch x')[0], 300), 200) // 8 Buchstaben: kein Zuschlag
    assert.ok(Math.abs(wordDuration(at('Dreizehnbuchs x')[0], 300) - 320) < 1e-9) // 13
  })

  it('wartet am Absatzende mindestens ×2,8', () => {
    assert.ok(Math.abs(wordDuration(at('Ende')[0], 300) - 560) < 1e-9)
    // Satzende + sehr langes Wort ergibt 2,2 + 0,6 = 2,8 → bleibt 2,8
    assert.ok(Math.abs(wordDuration(at('Donaudampfschiff.')[0], 300) - 560) < 1e-9)
  })

  it('verlangsamt die Anlaufwörter um ×1,6', () => {
    assert.ok(Math.abs(wordDuration(at('und so')[0], 300, true) - 320) < 1e-9)
  })

  it('berechnet die Restzeit', () => {
    const tokens = at('eins zwei drei')
    // 200 + 200 + 560 (Absatzende)
    assert.ok(Math.abs(remainingMs(tokens, 0, 300) - 960) < 1e-9)
    assert.ok(Math.abs(remainingMs(tokens, 2, 300) - 560) < 1e-9)
    assert.equal(remainingMs(tokens, 3, 300), 0)
  })

  it('formatiert Zeiten als m:ss', () => {
    assert.equal(formatDuration(0), '0:00')
    assert.equal(formatDuration(960), '0:01')
    assert.equal(formatDuration(65_000), '1:05')
  })

  it('begrenzt das Tempo auf 100–1000 in 25er-Schritten', () => {
    assert.equal(clampWpm(90), 100)
    assert.equal(clampWpm(1010), 1000)
    assert.equal(clampWpm(312), 300)
    assert.equal(clampWpm(313), 325)
    assert.equal(clampWpm(Number.NaN), 300)
  })
})

describe('Satz zurück', () => {
  const tokens = tokenize('Eins zwei drei. Vier fünf sechs. Sieben acht.')
  // Satzanfänge bei 0, 3 und 6

  it('springt mitten im Satz an dessen Anfang', () => {
    assert.equal(sentenceBackTarget(tokens, 5), 3)
    assert.equal(sentenceBackTarget(tokens, 4), 3)
    assert.equal(sentenceBackTarget(tokens, 7), 6) // auch im kurzen Satz
  })

  it('springt am Satzanfang zum vorherigen Satz', () => {
    assert.equal(sentenceBackTarget(tokens, 3), 0)
    assert.equal(sentenceBackTarget(tokens, 6), 3)
  })

  it('springt bei zweimal kurz hintereinander zum vorherigen Satz', () => {
    // Nach dem ersten Sprung ist der Leser schon ein Wort weiter
    assert.equal(sentenceBackTarget(tokens, 4, true), 0)
    assert.equal(sentenceBackTarget(tokens, 7, true), 3)
  })

  it('bleibt am Textanfang', () => {
    assert.equal(sentenceBackTarget(tokens, 0), 0)
    assert.equal(sentenceBackTarget(tokens, 1), 0)
    assert.equal(sentenceBackTarget(tokens, 1, true), 0)
    assert.equal(sentenceBackTarget([], 0), 0)
  })
})
