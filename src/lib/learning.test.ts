// Tests für Lerntage, Sitzungsablauf und „Schlau lernen“. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SAMPLE_COURSE } from '../content/sample-course.ts'
import { cardKey, tileQuestions } from './model.ts'
import {
  advance,
  answer,
  firstTryStats,
  isFinished,
  lookupQuestion,
  pendingRetries,
  reviewItems,
  startSession,
  tileItems,
} from './session.ts'
import { atRiskCards, pickForReview, planSmartSession } from './smart.ts'
import { DAY, newCard } from './srs.ts'
import { addDays, currentStreak, dayKey, hasStamp, monthGrid, totalStamps, weekKeys } from './streak.ts'
import { EMPTY_LEARN, isQuestion, type LearnState } from './types.ts'

const T0 = new Date(2026, 10, 12, 9).getTime() // Do, 12.11.2026
const fixed = () => 0.42

describe('Lerntage', () => {
  const day = { tiles: 1, reviews: 0, ms: 1000 }

  it('bildet Tages-Schlüssel in Ortszeit und rechnet mit Tagen', () => {
    assert.equal(dayKey(T0), '2026-11-12')
    assert.equal(addDays('2026-11-30', 1), '2026-12-01')
    assert.equal(addDays('2026-03-01', -1), '2026-02-28')
  })

  it('zählt Stempel und die aktuelle Serie', () => {
    const days = {
      '2026-11-09': day,
      '2026-11-10': day,
      '2026-11-11': day,
      '2026-11-05': day,
      '2026-11-06': { tiles: 0, reviews: 0, ms: 500 }, // nur gelesen → kein Stempel
    }
    assert.equal(hasStamp(days['2026-11-06']), false)
    assert.equal(totalStamps(days), 4)
    // Heute noch nichts gelernt → Serie von gestern zählt weiter
    assert.equal(currentStreak(days, '2026-11-12'), 3)
    assert.equal(currentStreak({ ...days, '2026-11-12': day }, '2026-11-12'), 4)
    assert.equal(currentStreak(days, '2026-11-14'), 0)
  })

  it('liefert die Woche ab Montag und das Monatsblatt', () => {
    assert.deepEqual(weekKeys('2026-11-12'), [
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ])
    const grid = monthGrid(2026, 10) // November 2026 beginnt an einem Sonntag
    assert.equal(grid.length % 7, 0)
    assert.equal(grid.slice(0, 6).every((c) => c === null), true)
    assert.equal(grid[6], '2026-11-01')
    assert.equal(grid.filter(Boolean).length, 30)
  })
})

describe('Sitzungsablauf', () => {
  const tile = SAMPLE_COURSE.tiles[0]

  it('ordnet Einleitung, Seiten, Fragen und Rückblick', () => {
    const items = tileItems(SAMPLE_COURSE.id, tile, 'learn')
    assert.equal(items[0].kind, 'intro')
    assert.equal(items[items.length - 1].kind, 'recap')
    assert.equal(items.filter((i) => i.kind === 'page').length, 3)
    assert.equal(items.filter((i) => i.kind === 'question').length, tile.steps.filter(isQuestion).length)
  })

  it('lässt beim Nur-Lesen die Fragen weg', () => {
    const items = tileItems(SAMPLE_COURSE.id, tile, 'read')
    assert.equal(items.some((i) => i.kind === 'question'), false)
  })

  it('hängt falsch beantwortete Fragen hinten an – so lange, bis sie sitzen', () => {
    const refs = tileQuestions(tile).slice(0, 2).map(({ index }) => ({ courseId: SAMPLE_COURSE.id, tileId: tile.id, step: index }))
    let s = startSession(reviewItems(refs))
    const key = (i: number) => lookupQuestion([SAMPLE_COURSE], s.items[i] as never)!.key

    s = answer(s, key(0), false) // erste Frage falsch
    assert.equal(s.items.length, 3)
    assert.equal(pendingRetries(s), 1)
    s = advance(s)
    s = answer(s, key(1), true)
    s = advance(s)
    // Wiederholung der ersten Frage – wieder falsch
    s = answer(s, key(2), false)
    assert.equal(s.items.length, 4)
    s = advance(s)
    s = answer(s, key(3), true)
    s = advance(s)
    assert.equal(isFinished(s), true)
    // Gewertet wird nur der erste Versuch
    assert.deepEqual(firstTryStats(s), { correct: 1, total: 2 })
  })
})

describe('Auswahl für Wiederholung und „Schlau lernen“', () => {
  const courses = [SAMPLE_COURSE]
  const [t1, t2] = SAMPLE_COURSE.tiles

  function learnedTile(learn: LearnState, tileIndex: number, at: number): LearnState {
    const tile = SAMPLE_COURSE.tiles[tileIndex]
    const cards = { ...learn.cards }
    for (const { step } of tileQuestions(tile)) cards[cardKey(SAMPLE_COURSE.id, tile.id, step)] = newCard(true, at)
    return {
      ...learn,
      cards,
      tiles: {
        ...learn.tiles,
        [SAMPLE_COURSE.id]: { ...learn.tiles[SAMPLE_COURSE.id], [tile.id]: { status: 'done', startedAt: at, completedAt: at } },
      },
      lastCourseId: SAMPLE_COURSE.id,
    }
  }

  it('startet ohne Fortschritt mit der ersten Kachel', () => {
    const plan = planSmartSession(courses, EMPTY_LEARN, T0, 10, fixed)
    assert.equal(plan.kind, 'tile')
    assert.equal(plan.kind === 'tile' && plan.tile.id, t1.id)
  })

  it('setzt eine angefangene Kachel fort', () => {
    const learn: LearnState = { ...EMPTY_LEARN, tiles: { [SAMPLE_COURSE.id]: { [t2.id]: { status: 'learning', startedAt: T0 } } } }
    const plan = planSmartSession(courses, learn, T0, 10, fixed)
    assert.equal(plan.kind === 'tile' && plan.reason, 'continue')
    assert.equal(plan.kind === 'tile' && plan.tile.id, t2.id)
  })

  it('nimmt nach einer gelernten Kachel die nächste', () => {
    const plan = planSmartSession(courses, learnedTile(EMPTY_LEARN, 0, T0), T0 + DAY, 10, fixed)
    assert.equal(plan.kind === 'tile' && plan.tile.id, t2.id)
  })

  it('wiederholt zuerst gefährdete Fragen', () => {
    const learn = learnedTile(EMPTY_LEARN, 0, T0)
    assert.equal(atRiskCards(courses, learn, T0 + DAY).length, 0)
    const later = T0 + 5 * DAY
    assert.equal(atRiskCards(courses, learn, later).length, tileQuestions(t1).length)
    const plan = planSmartSession(courses, learn, later, 3, fixed)
    assert.equal(plan.kind === 'review' && plan.reason, 'due')
    assert.equal(plan.kind === 'review' && plan.refs.length, 3)
  })

  it('lässt „Wissen stärken“ auch ohne Fälliges zu', () => {
    let learn = EMPTY_LEARN
    SAMPLE_COURSE.tiles.forEach((_, i) => (learn = learnedTile(learn, i, T0)))
    assert.equal(pickForReview(courses, learn, T0 + 60_000, 5).length, 5)
    const plan = planSmartSession(courses, learn, T0 + 60_000, 5, fixed)
    assert.equal(plan.kind === 'review' && plan.reason, 'strengthen')
  })

  it('wählt die am stärksten gefährdeten Fragen', () => {
    let learn = learnedTile(EMPTY_LEARN, 0, T0 - 10 * DAY) // lange her
    learn = learnedTile(learn, 1, T0) // frisch gelernt
    const picked = pickForReview(courses, learn, T0, 3, undefined, fixed)
    assert.ok(picked.every((ref) => ref.tileId === t1.id))
    assert.equal(pickForReview(courses, learn, T0, 50, SAMPLE_COURSE.id).length, tileQuestions(t1).length + tileQuestions(t2).length)
  })
})
