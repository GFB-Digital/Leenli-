// Tests für die Geometrie der Wissenskarte. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CELL,
  COURSE_GAP,
  ROW,
  cellBounds,
  cellCenter,
  cellDistance,
  cellKey,
  growCells,
  layoutCourses,
  markRows,
  neighbors,
  hexagonPoints,
  seededRandom,
  type Cell,
} from './maplayout.ts'

describe('Sechseck-Karte', () => {
  it('lässt Nachbarn lückenlos aneinanderliegen', () => {
    // Alle sechs Nachbarn haben denselben Abstand = Breite eines Sechsecks
    for (const n of neighbors({ q: 0, r: 0 })) {
      const { x, y } = cellCenter(n)
      assert.ok(Math.abs(Math.hypot(x, y) - CELL) < 1e-9)
    }
    // Gemeinsame Ecken: die untere Spitze oben links ist eine obere Ecke der Zelle darunter
    const top = hexagonPoints(0, 0, CELL).split(' ')[3]
    const below = cellCenter({ q: 0, r: 1 })
    const corner = hexagonPoints(below.x, below.y, CELL).split(' ')[5]
    assert.equal(top, corner)
    assert.ok(Math.abs(below.y - ROW) < 1e-9)
  })

  it('hat sechs Nachbarn im Abstand 1', () => {
    const origin = { q: 0, r: 0 }
    const list = neighbors(origin)
    assert.equal(list.length, 6)
    for (const n of list) assert.equal(cellDistance(origin, n), 1)
    assert.equal(cellDistance(origin, { q: 2, r: -1 }), 2)
  })

  it('liefert Sechsecke mit Spitze oben', () => {
    const pts = hexagonPoints(0, 0, 60)
      .split(' ')
      .map((p) => p.split(',').map(Number))
    assert.equal(pts.length, 6)
    const xs = pts.map(([x]) => x)
    const ys = pts.map(([, y]) => y)
    assert.equal(Math.max(...xs) - Math.min(...xs), 60)
    assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - 120 / Math.sqrt(3)) < 0.02)
  })

  it('erzeugt wiederholbare Zufallszahlen', () => {
    assert.equal(seededRandom('kurs')(), seededRandom('kurs')())
    assert.notEqual(seededRandom('x')(), seededRandom('y')())
  })
})

describe('Kachel-Gruppe eines Kurses', () => {
  const connected = (cells: Cell[]) => {
    const keys = new Set(cells.map(cellKey))
    const seen = new Set([cellKey(cells[0])])
    const queue = [cells[0]]
    while (queue.length > 0) {
      for (const n of neighbors(queue.pop()!)) {
        const key = cellKey(n)
        if (keys.has(key) && !seen.has(key)) seen.add(key), queue.push(n)
      }
    }
    return seen.size === cells.length
  }

  it('legt jede Kachel auf eine eigene Zelle, zusammenhängend', () => {
    for (const n of [1, 2, 3, 5, 7, 12, 20, 36]) {
      const cells = growCells('kurs-a', n)
      assert.equal(cells.length, n)
      assert.equal(new Set(cells.map(cellKey)).size, n)
      assert.ok(connected(cells), `${n} Kacheln hängen nicht zusammen`)
    }
  })

  it('ist für denselben Kurs immer gleich, für verschiedene Kurse verschieden', () => {
    assert.deepEqual(growCells('abwl', 27), growCells('abwl', 27))
    assert.notDeepEqual(growCells('abwl', 27), growCells('konstruktion', 27))
  })

  it('hängt neue Kacheln an, ohne alte zu verschieben', () => {
    const big = growCells('fertigungstechnik', 36)
    for (const n of [1, 5, 20, 35]) assert.deepEqual(growCells('fertigungstechnik', n), big.slice(0, n))
  })

  it('führt den Lernweg von Kachel zu Nachbarkachel, soweit es geht', () => {
    // Jede Kachel dockt an der Gruppe an; oft direkt neben der vorherigen
    const cells = growCells('abwl', 27)
    let adjacent = 0
    for (let i = 1; i < cells.length; i++) {
      assert.ok(cells.slice(0, i).some((c) => cellDistance(c, cells[i]) === 1))
      if (cellDistance(cells[i - 1], cells[i]) === 1) adjacent++
    }
    assert.ok(adjacent >= cells.length / 3, `nur ${adjacent} direkte Schritte`)
  })

  it('bleibt kompakt und ohne eingeschlossene Löcher', () => {
    for (const seed of ['abwl', 'fertigungstechnik', 'konstruktion', 'lernen-lernen', 'x']) {
      for (const n of [12, 27, 36]) {
        const cells = growCells(seed, n)
        const keys = new Set(cells.map(cellKey))
        // kein freies Feld, das rundum von Kacheln umgeben ist
        for (const cell of cells) {
          for (const free of neighbors(cell)) {
            if (keys.has(cellKey(free))) continue
            assert.ok(neighbors(free).some((c) => !keys.has(cellKey(c))), `${seed}/${n}: Loch bei ${cellKey(free)}`)
          }
        }
        // nicht langgestreckt: Spannweite höchstens zwei Drittel der Kachelzahl
        const span = Math.max(...cells.flatMap((x) => cells.map((y) => cellDistance(x, y))))
        assert.ok(span <= Math.max(4, (n * 2) / 3), `${seed}/${n}: Spannweite ${span}`)
      }
    }
  })
})

describe('Kurse auf der Karte', () => {
  const courses = [
    { id: 'lernen-lernen', tileCount: 3 },
    { id: 'gehirn', tileCount: 12 },
    { id: 'geschichte', tileCount: 25 },
    { id: 'klein', tileCount: 1 },
  ]
  const layout = layoutCourses(courses)

  it('hält die Kachel-Reihenfolge und -Anzahl', () => {
    layout.forEach((course, i) => assert.equal(course.tiles.length, courses[i].tileCount))
  })

  it('lässt Kurse nicht überlappen und hält drei Zellen Abstand', () => {
    const all = layout.flatMap((course) => course.tiles.map((cell) => ({ cell, id: course.id })))
    assert.equal(new Set(all.map(({ cell }) => cellKey(cell))).size, all.length)
    for (const a of all) {
      for (const b of all) {
        if (a.id !== b.id) assert.ok(cellDistance(a.cell, b.cell) > COURSE_GAP, `${a.id} zu nah an ${b.id}`)
      }
    }
  })

  it('ist bei gleichen Kursen immer gleich', () => {
    assert.deepEqual(layoutCourses(courses), layout)
  })

  it('verschiebt frühere Kurse nicht, wenn hinten einer dazukommt', () => {
    const more = layoutCourses([...courses, { id: 'neu', tileCount: 9 }])
    assert.deepEqual(more.slice(0, layout.length), layout)
  })

  it('stellt Kurse desselben Themengebiets nebeneinander', () => {
    const center = (cells: Cell[]) => {
      const points = cells.map(cellCenter)
      return { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length }
    }
    const distance = (a: Cell[], b: Cell[]) => Math.hypot(center(a).x - center(b).x, center(a).y - center(b).y)
    const filler = Array.from({ length: 6 }, (_, i) => ({ id: `anderes-${i}`, tileCount: 10 }))
    const grouped = layoutCourses([{ id: 'ft-1', tileCount: 10, group: 'Fertigung' }, ...filler, { id: 'ft-2', tileCount: 10, group: 'Fertigung' }])
    const plain = layoutCourses([{ id: 'ft-1', tileCount: 10 }, ...filler, { id: 'ft-2', tileCount: 10 }])
    const last = grouped.length - 1
    assert.ok(distance(grouped[0].tiles, grouped[last].tiles) <= distance(plain[0].tiles, plain[last].tiles))
  })

  it('berechnet das umgebende Rechteck', () => {
    const box = cellBounds(layout[0].tiles)
    assert.ok(box.width >= CELL && box.height >= CELL)
  })
})

describe('Zeichen in einer Kachel', () => {
  it('verteilt alle Zeichen auf Reihen, vorne voller', () => {
    for (const n of [1, 4, 6, 7, 12, 25]) {
      const { rows } = markRows(n, 54)
      assert.equal(rows.reduce((a, b) => a + b, 0), n)
      for (let i = 1; i < rows.length; i++) assert.ok(rows[i] <= rows[i - 1])
    }
  })

  it('setzt wenige Zeichen nebeneinander in eine Reihe', () => {
    assert.deepEqual(markRows(6, 60).rows, [6])
    assert.equal(markRows(4, 60).scale, 1)
  })

  it('verkleinert bei vielen Zeichen, statt über den Rand zu laufen', () => {
    const many = markRows(30, 60)
    assert.ok(many.scale < 1 && many.scale > 0.3)
    assert.deepEqual(markRows(0, 60), { rows: [], scale: 1 })
  })
})
