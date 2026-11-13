// Tests für die Sicherung als Datei. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SAMPLE_COURSE } from '../content/sample-course.ts'
import { BACKUP_FORMAT, BACKUP_VERSION, backupFileName, createBackup, isBackup, parseBackup } from './backup.ts'
import { cardKey, tileQuestions } from './model.ts'
import { newCard } from './srs.ts'
import { DEFAULT_SETTINGS, EMPTY_LEARN, type Course, type LearnState, type Settings } from './types.ts'

const T0 = new Date(2026, 10, 13, 9)
const course: Course = { ...SAMPLE_COURSE, id: 'mein-kurs', title: 'Mein Kurs', group: 'Studium' }
const tile = course.tiles[0]

function sampleLearn(): LearnState {
  const cards: LearnState['cards'] = {}
  for (const { step } of tileQuestions(tile)) cards[cardKey(course.id, tile.id, step)] = newCard(true, T0.getTime())
  return {
    ...EMPTY_LEARN,
    cards,
    tiles: { [course.id]: { [tile.id]: { status: 'done', startedAt: 1, completedAt: 2, firstTry: { correct: 3, total: 4 } } } },
    days: { '2026-11-13': { tiles: 1, reviews: 0, ms: 60_000 } },
    courseMs: { [course.id]: 60_000 },
    answers: { total: 4, correct: 3 },
    lastCourseId: course.id,
    examDates: { [course.id]: '2027-02-10' },
    exams: { [course.id]: { at: 5, correct: 16, total: 20 } },
  }
}

const settings: Settings = { ...DEFAULT_SETTINGS, wpm: 425, theme: 'dark', reviewBatch: 15, lastBackupAt: 123 }

describe('Sicherung', () => {
  it('nennt die Datei nach dem Tag', () => {
    assert.equal(backupFileName(T0), 'topos-sicherung-2026-11-13.json')
  })

  it('kommt nach Speichern und Einlesen unverändert zurück', () => {
    const learn = sampleLearn()
    const text = JSON.stringify(createBackup({ courses: [course], learn, settings }, T0))
    const outcome = parseBackup(text)
    assert.ok(outcome.ok, outcome.ok ? '' : outcome.errors.join('\n'))
    assert.deepEqual(outcome.backup.courses, [course])
    assert.deepEqual(outcome.backup.learn, learn)
    assert.deepEqual(outcome.backup.settings, settings)
    assert.equal(outcome.backup.format, BACKUP_FORMAT)
    assert.equal(outcome.backup.version, BACKUP_VERSION)
  })

  it('fasst zusammen, was in der Sicherung steckt', () => {
    const outcome = parseBackup(JSON.stringify(createBackup({ courses: [course], learn: sampleLearn(), settings }, T0)))
    assert.ok(outcome.ok)
    assert.deepEqual(outcome.summary, {
      exportedAt: T0.getTime(),
      courses: 1,
      tiles: 1,
      cards: tileQuestions(tile).length,
      days: 1,
    })
  })

  it('funktioniert auch ohne eigene Kurse (nur Beispielkurs gelernt)', () => {
    const outcome = parseBackup(JSON.stringify(createBackup({ courses: [], learn: EMPTY_LEARN, settings: DEFAULT_SETTINGS }, T0)))
    assert.ok(outcome.ok)
    assert.deepEqual(outcome.backup.courses, [])
    assert.equal(outcome.summary.tiles, 0)
  })

  it('erkennt Sicherungen und unterscheidet sie von Kursen', () => {
    assert.equal(isBackup(createBackup({ courses: [], learn: EMPTY_LEARN, settings: DEFAULT_SETTINGS })), true)
    assert.equal(isBackup(course), false)
    assert.equal(isBackup([course]), false)
    const outcome = parseBackup(JSON.stringify(course))
    assert.equal(outcome.ok, false)
    assert.match(outcome.ok ? '' : outcome.errors[0], /keine Sicherung/)
  })

  it('meldet kaputte Dateien verständlich, statt Daten zu überschreiben', () => {
    const broken = parseBackup('{ "format": "topos-sicherung", ')
    assert.equal(broken.ok, false)
    assert.match(broken.ok ? '' : broken.errors[0], /kein gültiges JSON/)

    const backup = createBackup({ courses: [course], learn: sampleLearn(), settings }, T0)
    const newer = parseBackup(JSON.stringify({ ...backup, version: BACKUP_VERSION + 1 }))
    assert.equal(newer.ok, false)
    assert.match(newer.ok ? '' : newer.errors[0], /neueren Version/)

    const noLearn = parseBackup(JSON.stringify({ ...backup, learn: undefined }))
    assert.equal(noLearn.ok, false)

    const badCourse = parseBackup(JSON.stringify({ ...backup, courses: [{ id: 'x', title: 'Ohne Kacheln' }] }))
    assert.equal(badCourse.ok, false)
    assert.match(badCourse.ok ? '' : badCourse.errors.join(' '), /tiles/)
  })

  it('räumt Unbekanntes in Einstellungen und Lernstand weg', () => {
    const backup = createBackup({ courses: [], learn: sampleLearn(), settings }, T0)
    const outcome = parseBackup(
      JSON.stringify({
        ...backup,
        settings: { ...settings, theme: 'neon', map3d: true },
        learn: { ...backup.learn, examDates: { a: '2027-02-10', b: 'bald' }, exams: { a: { at: 1, correct: 2, total: 3 }, b: 'gut' } },
      }),
    )
    assert.ok(outcome.ok)
    assert.equal(outcome.backup.settings.theme, DEFAULT_SETTINGS.theme)
    assert.equal('map3d' in outcome.backup.settings, false)
    assert.deepEqual(outcome.backup.learn.examDates, { a: '2027-02-10' })
    assert.deepEqual(outcome.backup.learn.exams, { a: { at: 1, correct: 2, total: 3 } })
  })
})
