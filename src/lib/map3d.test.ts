// Tests für die 3D-Karte (Testmodus). Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CELL, cellCenter } from './maplayout.ts'
import { HEIGHT, TILT, columnHeight, depth, project, projectedBounds, rotateView, shadowPath, sideFaces } from './map3d.ts'

const close = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

describe('3D-Karte', () => {
  it('macht Säulen mit mehr Seiten und Fragen höher, aber nicht endlos', () => {
    assert.ok(columnHeight(8) > columnHeight(4))
    assert.equal(columnHeight(0), HEIGHT.base)
    assert.equal(columnHeight(500), HEIGHT.max)
    assert.equal(columnHeight(-3), HEIGHT.base)
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
})
