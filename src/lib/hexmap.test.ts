// Tests für die Geometrie der Wissenskarte. Aufruf: npm test

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { bounds, distance, keyOf, layoutClusters, ring, ringsFor, seededRandom, spiral, toPixel } from './hexmap.ts'

const O = { q: 0, r: 0 }

describe('Sechseck-Raster', () => {
  it('misst Abstände', () => {
    assert.equal(distance(O, { q: 2, r: -1 }), 2)
    assert.equal(distance({ q: -1, r: 3 }, { q: 2, r: -1 }), 4)
  })

  it('bildet Ringe und Spiralen ohne Doppelte', () => {
    assert.equal(ring(O, 0).length, 1)
    assert.equal(ring(O, 3).length, 18)
    assert.ok(ring(O, 3).every((hex) => distance(hex, O) === 3))
    const s = spiral(O, 19)
    assert.equal(new Set(s.map(keyOf)).size, 19)
    assert.deepEqual(s[0], O)
  })

  it('weiß, wie viele Ringe eine Kachelzahl braucht', () => {
    assert.deepEqual([1, 2, 7, 8, 19, 20].map(ringsFor), [0, 1, 1, 2, 2, 3])
  })

  it('rechnet in Pixel um (Nachbarn haben gleichen Abstand)', () => {
    const a = toPixel({ q: 1, r: 0 }, 10)
    const b = toPixel({ q: 0, r: 1 }, 10)
    assert.ok(Math.abs(Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)) < 1e-9)
  })

  it('erzeugt wiederholbare Zufallszahlen', () => {
    const a = seededRandom('kurs')
    const b = seededRandom('kurs')
    assert.equal(a(), b())
    assert.notEqual(seededRandom('x')(), seededRandom('y')())
  })
})

describe('Kurs-Cluster', () => {
  const courses = [
    { id: 'lernen-lernen', tileCount: 3 },
    { id: 'gehirn', tileCount: 12 },
    { id: 'geschichte', tileCount: 25 },
    { id: 'klein', tileCount: 1 },
  ]
  const layout = layoutClusters(courses)

  it('legt jede Kachel auf ein eigenes Feld', () => {
    layout.forEach((cluster, i) => {
      assert.equal(cluster.tiles.length, courses[i].tileCount)
      assert.equal(new Set(cluster.tiles.map(keyOf)).size, cluster.tiles.length)
    })
  })

  it('lässt Cluster nicht überlappen (mit Abstand)', () => {
    const owner = new Map<string, string>()
    for (const cluster of layout) {
      for (const hex of [...cluster.tiles, ...cluster.region]) {
        const key = keyOf(hex)
        assert.ok(!owner.has(key) || owner.get(key) === cluster.id, `Feld ${key} doppelt belegt`)
        owner.set(key, cluster.id)
      }
    }
    for (const a of layout) {
      for (const b of layout) {
        if (a === b) continue
        assert.ok(distance(a.center, b.center) >= a.extent + b.extent + 2)
      }
    }
  })

  it('ist bei gleichen Kursen immer gleich', () => {
    assert.deepEqual(layoutClusters(courses), layout)
  })

  it('berechnet das umgebende Rechteck', () => {
    const box = bounds(layout[0].tiles, 10)
    assert.ok(box.width > 0 && box.height > 0)
  })
})
