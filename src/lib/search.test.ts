// Tests für die Suche. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SAMPLE_COURSE } from '../content/sample-course.ts'
import { searchCourses, snippetAround } from './search.ts'

const courses = [SAMPLE_COURSE]

describe('Suche', () => {
  it('findet Kurse, Kacheln, Seiten und Fragen', () => {
    assert.equal(searchCourses(courses, 'Lernen lernen')[0].kind, 'course')
    const tiles = searchCourses(courses, 'Vergessenskurve').filter((hit) => hit.kind === 'tile')
    assert.equal(tiles[0].tileId, 'vergessenskurve')
    const pages = searchCourses(courses, 'Seeotter')
    assert.equal(pages[0].kind, 'page')
    assert.equal(pages[0].tileId, 'testeffekt')
    assert.match(pages[0].snippet ?? '', /Seeotter/)
    assert.ok(searchCourses(courses, 'Leitner').some((hit) => hit.kind === 'question'))
  })

  it('achtet nicht auf Groß- und Kleinschreibung, Umlaute und ß', () => {
    assert.ok(searchCourses(courses, 'SEEOTTER').length > 0)
    assert.ok(searchCourses(courses, 'gedachtnis').length > 0) // ohne Umlaut getippt
    assert.ok(searchCourses(courses, 'Mühe').length > 0)
  })

  it('verlangt alle Wörter der Anfrage', () => {
    assert.ok(searchCourses(courses, 'Roediger Seeotter').length > 0)
    assert.equal(searchCourses(courses, 'Roediger Kartoffelsalat').length, 0)
  })

  it('liefert nichts für leere oder zu kurze Anfragen und begrenzt die Liste', () => {
    assert.deepEqual(searchCourses(courses, ''), [])
    assert.deepEqual(searchCourses(courses, ' e '), [])
    assert.ok(searchCourses(courses, 'de', 3).length <= 3)
  })

  it('zeigt je Kachel höchstens einen Seiten- und einen Fragentreffer', () => {
    const hits = searchCourses(courses, 'Lernen')
    for (const kind of ['page', 'question'] as const) {
      const ids = hits.filter((hit) => hit.kind === kind).map((hit) => hit.tileId)
      assert.equal(new Set(ids).size, ids.length)
    }
  })

  it('schneidet die Textstelle an Wortgrenzen aus', () => {
    const text = 'Am Anfang steht ein langer Satz ohne Belang. Dann kommt der Testeffekt ins Spiel, und danach geht der Text noch eine ganze Weile weiter.'
    const snippet = snippetAround(text, ['testeffekt'], 20)
    assert.match(snippet, /Testeffekt/)
    assert.ok(snippet.startsWith('… ') && snippet.endsWith(' …'))
    assert.equal(snippetAround('Kurz.', ['kurz']), 'Kurz.')
  })
})
