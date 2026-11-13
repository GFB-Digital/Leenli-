// Tests für die 3D-Karte. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CELL, cellCenter } from './maplayout.ts'
import {
  HEIGHT,
  TILT,
  columnHeight,
  depth,
  keepInView,
  placeLabels,
  project,
  projectedBounds,
  rotateView,
  shadowPath,
  sideFaces,
  smoothstep,
} from './map3d.ts'

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

describe('3D-Karte', () => {
  it('macht Säulen umso höher, je fester das Wissen sitzt – begrenzt nach unten und oben', () => {
    assert.equal(columnHeight(0), HEIGHT.min)
    assert.equal(columnHeight(1), HEIGHT.max)
    assert.equal(columnHeight(-3), HEIGHT.min)
    assert.equal(columnHeight(7), HEIGHT.max)
    assert.equal(columnHeight(Number.NaN), HEIGHT.min)
    let previous = columnHeight(0)
    for (let p = 5; p <= 100; p += 5) {
      const h = columnHeight(p / 100)
      assert.ok(h > previous)
      previous = h
    }
  })

  it('spreizt die Höhen unten stärker als oben', () => {
    // Beispieltabelle aus dem Plan: 0, 10, 25, 50, 75, 90, 100 %
    assert.deepEqual(
      [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map((m) => Math.round(columnHeight(m))),
      [12, 34, 53, 78, 100, 112, 120],
    )
    // Der Schritt von „neu“ zu „frisch gelernt“ (16 %) ist deutlich sichtbar …
    assert.ok(columnHeight(0.16) - columnHeight(0) > 25)
    // … und größer als derselbe Schritt ganz oben
    assert.ok(columnHeight(0.16) - columnHeight(0) > columnHeight(1) - columnHeight(0.84))
  })

  it('verdeckt mit der höchsten Säule höchstens die Reihe direkt dahinter', () => {
    // Auf dem Bildschirm liegen zwei Reihen 2 × Zeilenabstand × cos(Neigung) auseinander
    const twoRows = 2 * ((CELL * Math.sqrt(3)) / 2) * Math.cos(TILT)
    assert.ok((HEIGHT.max - HEIGHT.min) * Math.sin(TILT) < twoRows)
  })

  it('hebt höhere Punkte auf dem Bildschirm nach oben', () => {
    const ground = project(10, 20, 0, 0.7)
    const top = project(10, 20, 50, 0.7)
    assert.ok(close(ground.x, top.x))
    assert.ok(close(ground.y - top.y, 50 * Math.sin(TILT)))
  })

  it('zeigt ohne Drehung genau die zwei unteren Seiten, links heller als rechts', () => {
    const faces = sideFaces(0, 0, CELL, 40, 0)
    assert.equal(faces.length, 2)
    // Kante 2 (unten rechts) kommt vor Kante 3 (unten links)
    const [right, left] = faces
    assert.ok(left.shade < right.shade)
  })

  it('zeigt bei jeder Drehung zwei oder drei Seiten', () => {
    for (let a = 0; a < 360; a += 7) {
      const count = sideFaces(0, 0, CELL, 40, (a * Math.PI) / 180).length
      assert.ok(count === 2 || count === 3, `${a}°: ${count} Seiten`)
    }
    assert.equal(sideFaces(0, 0, CELL, 0, 0).length, 0)
  })

  it('sortiert vordere Säulen nach hinten in der Zeichenreihenfolge', () => {
    const back = cellCenter({ q: 0, r: 0 })
    const front = cellCenter({ q: 0, r: 1 })
    assert.ok(depth(front.x, front.y, 0) > depth(back.x, back.y, 0))
    // Um 180° gedreht ist es umgekehrt
    assert.ok(depth(front.x, front.y, Math.PI) < depth(back.x, back.y, Math.PI))
  })

  it('wirft einen geschlossenen Schatten, der mit der Höhe wächst', () => {
    const low = shadowPath(0, 0, CELL, 10, 0)
    const high = shadowPath(0, 0, CELL, 80, 0)
    assert.match(low, /^M.*Z$/)
    const maxX = (path: string) => Math.max(...[...path.matchAll(/[ML](-?[\d.]+)/g)].map((m) => Number(m[1])))
    assert.ok(maxX(high) > maxX(low))
  })

  it('schließt Boden und Deckel aller Säulen ein', () => {
    const cells = [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }]
    const heights = [20, 60, 30]
    for (const rot of [0, 1, 2.5, 4]) {
      const box = projectedBounds(cells, heights, rot)
      cells.forEach((cell, i) => {
        const { x, y } = cellCenter(cell)
        for (const z of [0, heights[i]]) {
          const p = project(x, y, z, rot)
          assert.ok(p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY)
        }
      })
    }
  })

  it('dreht um den Punkt zwischen den Fingern', () => {
    const view = { x: 120, y: 340, k: 1.7, r: 0.4 }
    const world = { x: 35, y: -80 }
    const screen = (v: typeof view) => {
      const p = project(world.x, world.y, 0, v.r)
      return { x: v.x + p.x * v.k, y: v.y + p.y * v.k }
    }
    const pivot = screen(view)
    const turned = rotateView(view, pivot.x, pivot.y, 0.9)
    assert.ok(close(turned.r, 1.3))
    const after = screen(turned)
    assert.ok(close(after.x, pivot.x) && close(after.y, pivot.y))
  })

  it('hält die Karte beim Verschieben im Bild', () => {
    const box = { minX: 0, minY: 0, maxX: 400, maxY: 300 }
    const inside = { x: 20, y: 30, k: 1, r: 0 }
    assert.equal(keepInView(inside, box, 390, 844, 90), inside)
    // weit nach links hinausgeschoben → rechte Kante bleibt 90 px im Bild
    const left = keepInView({ x: -2000, y: 30, k: 1, r: 0 }, box, 390, 844, 90)
    assert.equal(box.maxX * left.k + left.x, 90)
    // weit nach unten hinaus → obere Kante bleibt 90 px über dem unteren Rand
    const down = keepInView({ x: 20, y: 5000, k: 2, r: 0.3 }, box, 390, 844, 90)
    assert.equal(box.minY * down.k + down.y, 844 - 90)
    assert.equal(down.r, 0.3)
  })

  it('blendet weich zwischen zwei Zoomstufen', () => {
    assert.equal(smoothstep(54, 82, 40), 0)
    assert.equal(smoothstep(54, 82, 100), 1)
    assert.equal(smoothstep(54, 82, 68), 0.5)
    assert.ok(smoothstep(54, 82, 60) < smoothstep(54, 82, 61))
  })

  it('setzt Kursnamen so, dass sie sich nicht überdecken', () => {
    const box = (x: number, top: number) => ({ x, top, width: 120, height: 40 })
    // Jeder Name hat zwei mögliche Stellen: über und unter seiner Gruppe
    const options = [
      [box(100, 100), box(100, 260)],
      [box(150, 110), box(150, 200)], // oben würde er den ersten überdecken → unten
      [box(120, 105), box(140, 190)], // passt nirgends mehr
    ]
    assert.deepEqual(placeLabels(options, [0, 1, 2]), [0, 1, -1])
    // Andere Reihenfolge = andere Vorfahrt
    assert.deepEqual(placeLabels(options, [2, 1, 0]), [1, 1, 0])
  })
})
