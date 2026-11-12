// Tests für die Geometrie der Wissenskarte. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { blockCells, cellBounds, cellKey, layoutCourses, octagonPoints, seededRandom } from './maplayout.ts'

describe('Kachel-Block', () => {
  it('ordnet Kacheln zeilenweise und fast quadratisch an', () => {
    assert.deepEqual(blockCells(1), [{ col: 0, row: 0 }])
    assert.deepEqual(blockCells(4), [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ])
    const nine = blockCells(9)
    assert.equal(Math.max(...nine.map((c) => c.col)), 2)
    assert.equal(Math.max(...nine.map((c) => c.row)), 2)
  })

  it('setzt eine unvollständige letzte Zeile mittig, wenn es aufgeht', () => {
    // 7 Kacheln → 3 Spalten, letzte Zeile mit 1 Kachel in der Mitte
    assert.deepEqual(blockCells(7)[6], { col: 1, row: 2 })
    // 3 Kacheln → 2 Spalten, die letzte bleibt links (halbe Zelle geht nicht)
    assert.deepEqual(blockCells(3)[2], { col: 0, row: 1 })
  })

  it('legt jede Kachel auf eine eigene Zelle', () => {
    for (const n of [1, 2, 5, 12, 30]) {
      const cells = blockCells(n)
      assert.equal(cells.length, n)
      assert.equal(new Set(cells.map(cellKey)).size, n)
    }
  })
})

describe('Achtecke', () => {
  it('liefert 8 Eckpunkte mit gleicher Breite und Höhe', () => {
    const pts = octagonPoints(0, 0, 50)
      .split(' ')
      .map((p) => p.split(',').map(Number))
    assert.equal(pts.length, 8)
    const xs = pts.map(([x]) => x)
    const ys = pts.map(([, y]) => y)
    assert.equal(Math.max(...xs) - Math.min(...xs), 50)
    assert.equal(Math.max(...ys) - Math.min(...ys), 50)
  })

  it('erzeugt wiederholbare Zufallszahlen', () => {
    assert.equal(seededRandom('kurs')(), seededRandom('kurs')())
    assert.notEqual(seededRandom('x')(), seededRandom('y')())
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

  it('lässt Gebiete nicht überlappen und hält Abstand', () => {
    const owner = new Map<string, string>()
    for (const course of layout) {
      for (const cell of [...course.tiles, ...course.territory]) {
        const key = cellKey(cell)
        assert.ok(!owner.has(key), `Zelle ${key} doppelt belegt`)
        owner.set(key, course.id)
      }
    }
    // Keine zwei Kurse berühren sich direkt
    for (const course of layout) {
      for (const cell of [...course.tiles, ...course.territory]) {
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            const other = owner.get(cellKey({ col: cell.col + dc, row: cell.row + dr }))
            assert.ok(!other || other === course.id, `${course.id} berührt ${other}`)
          }
        }
      }
    }
  })

  it('umgibt die Kacheln vollständig mit Gebiet', () => {
    const course = layout[1]
    const all = new Set([...course.tiles, ...course.territory].map(cellKey))
    for (const t of course.tiles) {
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) assert.ok(all.has(cellKey({ col: t.col + dc, row: t.row + dr })))
      }
    }
  })

  it('ist bei gleichen Kursen immer gleich', () => {
    assert.deepEqual(layoutCourses(courses), layout)
  })

  it('berechnet das umgebende Rechteck', () => {
    const box = cellBounds(layout[0].tiles)
    assert.ok(box.width >= 60 && box.height >= 60)
  })
})
