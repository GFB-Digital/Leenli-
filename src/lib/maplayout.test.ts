// Tests für die Geometrie der Wissenskarte. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CELL,
  ROW,
  blockCells,
  cellBounds,
  cellCenter,
  cellDistance,
  cellKey,
  layoutCourses,
  markRows,
  neighbors,
  hexagonPoints,
  hexagonsPath,
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

  it('fasst viele Sechsecke zu einem Pfad zusammen', () => {
    const d = hexagonsPath([{ q: 0, r: 0 }, { q: 1, r: 0 }], 60)
    assert.equal(d.match(/M/g)?.length, 2)
    assert.equal(d.match(/Z/g)?.length, 2)
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
    for (const n of [1, 2, 3, 5, 7, 12, 20, 30]) {
      const cells = blockCells(n)
      assert.equal(cells.length, n)
      assert.equal(new Set(cells.map(cellKey)).size, n)
      assert.ok(connected(cells), `${n} Kacheln hängen nicht zusammen`)
    }
  })

  it('ordnet zeilenweise von oben links nach unten rechts', () => {
    const cells = blockCells(12)
    assert.equal(cells[0].r, 0)
    for (let i = 1; i < cells.length; i++) {
      const a = cellCenter(cells[i - 1])
      const b = cellCenter(cells[i])
      assert.ok(a.y < b.y || (a.y === b.y && a.x < b.x))
    }
  })

  it('bildet eine rundliche Form ohne Lücken in den Zeilen', () => {
    for (const n of [7, 12, 19]) {
      const cells = blockCells(n)
      const rows = new Map<number, number[]>()
      for (const c of cells) rows.set(c.r, [...(rows.get(c.r) ?? []), c.q])
      for (const qs of rows.values()) assert.equal(Math.max(...qs) - Math.min(...qs) + 1, qs.length)
      const box = cellBounds(cells)
      assert.ok(box.width / box.height < 1.6 && box.height / box.width < 1.6, `${n}: zu langgestreckt`)
    }
    // 7 Kacheln → Wabe 2-3-2
    assert.deepEqual(
      [...new Set(blockCells(7).map((c) => c.r))].map((r) => blockCells(7).filter((c) => c.r === r).length),
      [2, 3, 2],
    )
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

  it('lässt Gebiete nicht überlappen und hält eine Zelle Abstand', () => {
    const owner = new Map<string, string>()
    for (const course of layout) {
      for (const cell of [...course.tiles, ...course.territory]) {
        const key = cellKey(cell)
        assert.ok(!owner.has(key), `Zelle ${key} doppelt belegt`)
        owner.set(key, course.id)
      }
    }
    for (const course of layout) {
      for (const cell of [...course.tiles, ...course.territory]) {
        for (const n of neighbors(cell)) {
          const other = owner.get(cellKey(n))
          assert.ok(!other || other === course.id, `${course.id} berührt ${other}`)
        }
      }
    }
  })

  it('umgibt die Kacheln vollständig mit Gebiet', () => {
    for (const course of layout) {
      const all = new Set([...course.tiles, ...course.territory].map(cellKey))
      for (const t of course.tiles) for (const n of neighbors(t)) assert.ok(all.has(cellKey(n)))
    }
  })

  it('legt Schmuck-Umrisse nur auf das Gebiet', () => {
    for (const course of layout) {
      const territory = new Set(course.territory.map(cellKey))
      for (const c of course.decor) assert.ok(territory.has(cellKey(c)))
    }
  })

  it('ist bei gleichen Kursen immer gleich', () => {
    assert.deepEqual(layoutCourses(courses), layout)
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
