// Tests für die Beherrschung von Kacheln (Grundlage der Säulenhöhen). Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SAMPLE_COURSE } from '../content/sample-course.ts'
import { LEVELS, cardStrength, courseMastery, masteryLevel, tileMastery } from './mastery.ts'
import { cardKey, tileQuestions } from './model.ts'
import { DAY, newCard, reviewCard } from './srs.ts'
import { EMPTY_LEARN, type CardState, type LearnState } from './types.ts'

const T0 = new Date(2026, 10, 13, 9).getTime()
const tile = SAMPLE_COURSE.tiles[0]

/** Lernstand: erste Kachel gelernt, alle Fragen mit derselben Karte */
function learned(card: CardState): LearnState {
  const cards: LearnState['cards'] = {}
  for (const { step } of tileQuestions(tile)) cards[cardKey(SAMPLE_COURSE.id, tile.id, step)] = card
  return {
    ...EMPTY_LEARN,
    cards,
    tiles: { [SAMPLE_COURSE.id]: { [tile.id]: { status: 'done', startedAt: T0, completedAt: T0 } } },
  }
}

describe('Beherrschung', () => {
  it('ist 0 für neue und angefangene Kacheln', () => {
    assert.deepEqual(tileMastery(SAMPLE_COURSE, tile, EMPTY_LEARN, T0), { status: 'new', mastery: 0, due: false })
    const started: LearnState = { ...EMPTY_LEARN, tiles: { [SAMPLE_COURSE.id]: { [tile.id]: { status: 'learning', startedAt: T0 } } } }
    assert.equal(tileMastery(SAMPLE_COURSE, tile, started, T0).mastery, 0)
    assert.equal(masteryLevel(tileMastery(SAMPLE_COURSE, tile, started, T0)), 'learning')
  })

  it('beginnt nach dem Lernen niedrig und wächst mit jeder pünktlichen Wiederholung', () => {
    let card = newCard(true, T0)
    const values = [cardStrength(card)]
    for (let i = 0; i < 6; i++) {
      card = reviewCard(card, true, card.due)
      values.push(cardStrength(card))
    }
    assert.ok(values[0] > 0.1 && values[0] < 0.2, `frisch gelernt: ${values[0]}`)
    for (let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1])
    assert.equal(values[values.length - 1], 1)
  })

  it('sinkt nicht von selbst mit der Zeit – fällig ist eine eigene Angabe', () => {
    const learn = learned(newCard(true, T0))
    const fresh = tileMastery(SAMPLE_COURSE, tile, learn, T0 + DAY)
    const later = tileMastery(SAMPLE_COURSE, tile, learn, T0 + 30 * DAY)
    assert.equal(fresh.mastery, later.mastery)
    assert.equal(fresh.due, false)
    assert.equal(later.due, true)
  })

  it('sinkt nach einem Fehler', () => {
    const good = reviewCard(reviewCard(newCard(true, T0), true, T0 + 3 * DAY), true, T0 + 12 * DAY)
    const lapsed = reviewCard(good, false, good.due)
    assert.ok(cardStrength(lapsed) < cardStrength(good))
    assert.ok(cardStrength(newCard(false, T0)) < cardStrength(newCard(true, T0)))
  })

  it('teilt gelernte Kacheln in frisch, gefestigt und langfristig sicher', () => {
    const level = (mastery: number) => masteryLevel({ status: 'done', mastery, due: false })
    assert.equal(level(0.16), 'fresh')
    assert.equal(level(LEVELS.solid), 'solid')
    assert.equal(level(LEVELS.secure), 'secure')
    assert.equal(masteryLevel({ status: 'new', mastery: 0, due: false }), 'new')
  })

  it('mittelt über die Fragen einer Kachel und die Kacheln eines Kurses', () => {
    const learn = learned(newCard(true, T0))
    const one = tileMastery(SAMPLE_COURSE, tile, learn, T0).mastery
    assert.ok(Math.abs(one - cardStrength(newCard(true, T0))) < 1e-9)
    assert.ok(Math.abs(courseMastery(SAMPLE_COURSE, learn, T0) - one / SAMPLE_COURSE.tiles.length) < 1e-9)
  })

  it('zählt eine gelernte Kachel ohne Fragen wie frisch gelernt', () => {
    const readOnly = { ...tile, id: 'nur-lesen', steps: tile.steps.filter((step) => step.type === 'text') }
    const learn: LearnState = { ...EMPTY_LEARN, tiles: { [SAMPLE_COURSE.id]: { 'nur-lesen': { status: 'done', startedAt: T0, completedAt: T0 } } } }
    const state = tileMastery(SAMPLE_COURSE, readOnly, learn, T0)
    assert.equal(state.due, false)
    assert.ok(state.mastery > 0.1 && state.mastery < 0.2)
  })
})
