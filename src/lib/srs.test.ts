// Tests für die Wiederholung in wachsenden Abständen. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DAY,
  daysUntilForgetting,
  formatDue,
  isAtRisk,
  median,
  newCard,
  prognosisPosition,
  retrievability,
  reviewCard,
  SRS,
} from './srs.ts'

const T0 = Date.UTC(2026, 10, 12, 9)
const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`)

describe('Erinnerungswahrscheinlichkeit', () => {
  it('ist direkt nach dem Lernen 100 % und nach S Tagen 90 %', () => {
    const card = newCard(true, T0)
    near(retrievability(card, T0), 1)
    near(retrievability(card, T0 + card.s * DAY), 0.9)
    assert.ok(retrievability(card, T0 + 30 * DAY) < 0.7)
  })

  it('markiert Fragen ab der Fälligkeit als gefährdet', () => {
    const card = newCard(true, T0)
    assert.equal(isAtRisk(card, T0 + 2 * DAY), false)
    assert.equal(isAtRisk(card, T0 + 3.1 * DAY), true)
    near(card.due, T0 + 3 * DAY)
  })
})

describe('Neue Karten', () => {
  it('starten länger, wenn die Frage auf Anhieb richtig war', () => {
    assert.equal(newCard(true, T0).s, SRS.firstCorrect)
    assert.equal(newCard(false, T0).s, SRS.firstWrong)
    assert.equal(newCard(false, T0).lapses, 1)
  })
})

describe('Wiederholen', () => {
  it('lässt die Stabilität bei richtiger Antwort zur Fälligkeit stark wachsen', () => {
    const card = newCard(true, T0)
    const later = reviewCard(card, true, card.due)
    near(later.s, card.s * card.ease) // 3 × 2,5 = 7,5 Tage
    assert.equal(later.reps, 2)
    near(later.due, card.due + later.s * DAY)
  })

  it('lässt den Abstand langsamer wachsen, wenn man die Antwort hätte raten können', () => {
    const card = newCard(true, T0)
    const free = reviewCard(card, true, card.due) // frei abgerufen (Karteikarte)
    const four = reviewCard(card, true, card.due, 0.25) // eine von vier Antworten
    const two = reviewCard(card, true, card.due, 0.5) // Stimmt / Stimmt nicht
    assert.ok(free.s > four.s && four.s > two.s && two.s > card.s)
    // bei zwei Antworten ein Viertel weniger Zuwachs
    near(two.s - card.s, (free.s - card.s) * 0.75)
    // ein Fehler wiegt immer gleich schwer
    assert.deepEqual(reviewCard(card, false, card.due, 0.5), reviewCard(card, false, card.due))
  })

  it('bringt bei sofortigem Wiederholen kaum Zuwachs – aber auch keinen Schaden', () => {
    const card = newCard(true, T0)
    const again = reviewCard(card, true, T0 + 60_000)
    assert.ok(again.s >= card.s && again.s < card.s * 1.01)
    near(retrievability(again, T0 + 60_000), 1)
  })

  it('belohnt späte, aber richtige Antworten stärker (begrenzt)', () => {
    const card = newCard(true, T0)
    const onTime = reviewCard(card, true, card.due)
    const late = reviewCard(card, true, T0 + 9 * DAY)
    assert.ok(late.s > onTime.s)
    assert.ok(late.s <= card.s * (1 + (card.ease - 1) * 2) + 1e-9)
  })

  it('verkürzt den Abstand nach einem Fehler deutlich', () => {
    let card = newCard(true, T0)
    card = reviewCard(card, true, card.due) // 7,5 Tage
    const lapse = reviewCard(card, false, card.due)
    near(lapse.s, 7.5 * SRS.lapseFactor)
    assert.equal(lapse.lapses, 1)
    assert.ok(lapse.ease < card.ease)
  })

  it('wird nie kürzer als ein halber Tag', () => {
    let card = newCard(false, T0)
    for (let i = 0; i < 5; i++) card = reviewCard(card, false, card.due)
    assert.equal(card.s, SRS.minStability)
    assert.equal(card.ease, SRS.minEase)
  })

  it('wächst bei regelmäßigem Wiederholen auf Monate', () => {
    let card = newCard(true, T0)
    for (let i = 0; i < 4; i++) card = reviewCard(card, true, card.due)
    assert.ok(card.s > 90, `S = ${card.s}`)
  })
})

describe('Gedächtnis-Prognose', () => {
  it('rechnet, wie lange man etwas noch weiß', () => {
    const card = newCard(true, T0)
    const days = daysUntilForgetting(card, T0)
    assert.ok(days > card.s, 'unter 80 % fällt man erst nach der Fälligkeit')
    near(daysUntilForgetting(card, T0 + 2 * DAY), days - 2)
  })

  it('bildet Tage auf die Skala ab', () => {
    assert.equal(prognosisPosition(-1), 0)
    near(prognosisPosition(14), 0.2)
    near(prognosisPosition(30), 0.4)
    near(prognosisPosition(365), 0.8)
    assert.equal(prognosisPosition(5000), 1)
    const between = prognosisPosition(60)
    assert.ok(between > 0.4 && between < 0.6)
  })

  it('nutzt den Median', () => {
    assert.equal(median([]), 0)
    assert.equal(median([5, 1, 3]), 3)
    assert.equal(median([1, 2, 3, 100]), 2.5)
  })
})

describe('Fälligkeit als Text', () => {
  it('formuliert verständlich', () => {
    assert.equal(formatDue(T0, T0), 'heute')
    assert.equal(formatDue(T0 + DAY, T0), 'morgen')
    assert.equal(formatDue(T0 + 3 * DAY, T0), 'in 3 Tagen')
    assert.equal(formatDue(T0 + 21 * DAY, T0), 'in 3 Wochen')
    assert.equal(formatDue(T0 + 120 * DAY, T0), 'in 4 Monaten')
    assert.equal(formatDue(T0 + 800 * DAY, T0), 'in 2 Jahren')
  })
})
