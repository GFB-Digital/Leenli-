// Geometrie der Wissenskarte: Sechsecke (Spitze oben), die lückenlos aneinanderliegen.
//
// Die Zeilen sind um eine halbe Zelle versetzt; jede Zelle hat sechs Nachbarn.
// Gerechnet wird mit axialen Koordinaten (q, r) wie bei üblichen Sechseck-Karten.
//
// Jeder Kurs ist eine rundliche Gruppe aus Kacheln (zeilenweise in
// Lernreihenfolge), umgeben von einer Fläche („Gebiet“). Die Kurse werden so
// angeordnet, dass zwischen ihren Gebieten immer eine Zelle frei bleibt.
// Reine Funktionen → maplayout.test.ts.

/** Breite einer Zelle (Kante zu Kante) = Abstand zweier Nachbarn in einer Zeile, in Kartenpixeln bei Zoom 1 */
export const CELL = 60
/** Höhe eines Sechsecks (Spitze zu Spitze) */
export const CELL_HEIGHT = (CELL * 2) / Math.sqrt(3)
/** Zeilenabstand: die schrägen Kanten liegen genau aufeinander */
export const ROW = (CELL * Math.sqrt(3)) / 2

export interface Cell {
  q: number
  r: number
}

export const cellKey = (c: Cell) => `${c.q},${c.r}`

/** Mittelpunkt einer Zelle in Kartenpixeln */
export function cellCenter(c: Cell): { x: number; y: number } {
  return { x: (c.q + c.r / 2) * CELL, y: c.r * ROW }
}

const DIRECTIONS: Cell[] = [
  { q: 1, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
]

/** Die sechs Nachbarzellen (links, rechts und je zwei darüber und darunter) */
export function neighbors(c: Cell): Cell[] {
  return DIRECTIONS.map((d) => ({ q: c.q + d.q, r: c.r + d.r }))
}

/** Anzahl Schritte von Zelle zu Zelle */
export function cellDistance(a: Cell, b: Cell): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

function hexagonCorners(cx: number, cy: number, width: number): [number, number][] {
  const w = width / 2
  const h = width / Math.sqrt(3)
  return [
    [cx, cy - h],
    [cx + w, cy - h / 2],
    [cx + w, cy + h / 2],
    [cx, cy + h],
    [cx - w, cy + h / 2],
    [cx - w, cy - h / 2],
  ]
}

const fmt = (n: number) => n.toFixed(2)

/** Eckpunkte eines Sechsecks mit Breite `width` (Kante zu Kante, Spitze oben), für `<polygon points>` */
export function hexagonPoints(cx: number, cy: number, width: number): string {
  return hexagonCorners(cx, cy, width)
    .map(([x, y]) => `${fmt(x)},${fmt(y)}`)
    .join(' ')
}

/**
 * Viele Sechsecke als ein SVG-Pfad. Alle laufen im gleichen Drehsinn, deshalb
 * ergibt die Füllung ihre Vereinigung – eine Fläche, deren Rand den Sechsecken folgt.
 */
export function hexagonsPath(cells: Cell[], width: number): string {
  return cells
    .map((cell) => {
      const { x, y } = cellCenter(cell)
      const [first, ...rest] = hexagonCorners(x, y, width)
      return `M${fmt(first[0])} ${fmt(first[1])}` + rest.map(([px, py]) => `L${fmt(px)} ${fmt(py)}`).join('') + 'Z'
    })
    .join('')
}

/** Zufallszahlen, die für denselben Text immer gleich ausfallen (mulberry32) */
export function seededRandom(seed: string): () => number {
  let h = 1779033703
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 3432918353)
  let a = (h ^ (h >>> 16)) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Senkrechte Abstände zählen etwas weniger → Kurse werden eher hoch als breit (passt zum Handy) */
const UPRIGHT = 0.9

/** Mögliche Mittelpunkte einer Kachelgruppe: Zellmitte, zwischen zwei Zellen, zwischen drei Zellen */
const GROUP_CENTERS = [
  { x: 0, y: 0 },
  { x: CELL / 2, y: 0 },
  { x: CELL / 4, y: ROW / 2 },
  { x: CELL / 2, y: ROW / 3 },
  { x: CELL, y: (2 * ROW) / 3 },
]

/** Kachel-Reihenfolge: zeilenweise von oben nach unten, in jeder Zeile von links nach rechts */
function readingOrder(a: Cell, b: Cell): number {
  return a.r - b.r || a.q + a.r / 2 - (b.q + b.r / 2)
}

/**
 * Kacheln eines Kurses als möglichst runde Gruppe (wie eine Wabe) anordnen.
 * Ausprobiert werden mehrere Mittelpunkte; genommen wird die kompakteste Form.
 */
export function blockCells(count: number): Cell[] {
  const n = Math.max(1, count)
  const radius = Math.ceil(Math.sqrt(n)) + 2
  const pool: Cell[] = []
  for (let r = -radius; r <= radius; r++) {
    for (let q = -2 * radius; q <= 2 * radius; q++) {
      if (cellDistance({ q, r }, { q: 0, r: 0 }) <= radius) pool.push({ q, r })
    }
  }
  const weighted = (cell: Cell, cx: number, cy: number) => {
    const { x, y } = cellCenter(cell)
    return (x - cx) ** 2 + ((y - cy) * UPRIGHT) ** 2
  }

  let best: { cells: Cell[]; spread: number } | null = null
  for (const center of GROUP_CENTERS) {
    const cells = [...pool]
      .sort((a, b) => weighted(a, center.x, center.y) - weighted(b, center.x, center.y) || readingOrder(a, b))
      .slice(0, n)
    const mx = cells.reduce((sum, c) => sum + cellCenter(c).x, 0) / n
    const my = cells.reduce((sum, c) => sum + cellCenter(c).y, 0) / n
    const spread = cells.reduce((sum, c) => sum + weighted(c, mx, my), 0)
    if (!best || spread < best.spread - 1e-6) best = { cells, spread }
  }

  return normalize(best!.cells).sort(readingOrder)
}

/** Verschiebt Zellen so, dass die erste Zeile r = 0 ist und die linke Kante bei x ≈ 0 liegt */
function normalize(cells: Cell[]): Cell[] {
  const minR = Math.min(...cells.map((c) => c.r))
  const moved = cells.map((c) => ({ q: c.q, r: c.r - minR }))
  const minX = Math.min(...moved.map((c) => c.q + c.r / 2))
  const dq = -Math.floor(minX)
  return moved.map((c) => ({ q: c.q + dq, r: c.r }))
}

export interface CourseLayout {
  id: string
  /** Zellen der Kacheln in Kachel-Reihenfolge (absolut) */
  tiles: Cell[]
  /** Zellen der umgebenden Fläche (absolut, ohne Kacheln) */
  territory: Cell[]
  /** Teil des Gebiets, auf dem zarte Sechseck-Umrisse liegen (Schmuck) */
  decor: Cell[]
}

/** Kacheln + Gebiet eines Kurses, relativ zum Ursprung */
function buildCourse(id: string, tileCount: number): CourseLayout {
  const random = seededRandom(id)
  const tiles = blockCells(tileCount)
  const taken = new Set(tiles.map(cellKey))
  const territory: Cell[] = []
  const add = (cell: Cell) => {
    taken.add(cellKey(cell))
    territory.push(cell)
  }
  // Erster Ring geschlossen, zweiter ausgefranst → natürliche Form ohne Löcher
  const ring1: Cell[] = []
  for (const t of tiles) for (const c of neighbors(t)) if (!taken.has(cellKey(c))) add(c), ring1.push(c)
  for (const t of ring1) for (const c of neighbors(t)) if (!taken.has(cellKey(c)) && random() < 0.5) add(c)
  // Zarte Umrisse nur abseits der Kacheln, damit sie nicht wie Kacheln wirken
  const nearTiles = new Set(ring1.map(cellKey))
  const decor = territory.filter((c) => !nearTiles.has(cellKey(c)) && random() < 0.5)
  return { id, tiles, territory, decor }
}

/** Mögliche Verschiebungen, nach Abstand zur Kartenmitte sortiert (hochkant bevorzugt) */
const SHIFTS: Cell[] = (() => {
  const reach = 60
  const list: Cell[] = []
  for (let r = -reach; r <= reach; r++) {
    for (let q = -reach - Math.ceil(r / 2); q <= reach - Math.floor(r / 2); q++) list.push({ q, r })
  }
  const cost = (c: Cell) => {
    const { x, y } = cellCenter(c)
    return (x * 1.5) ** 2 + y ** 2
  }
  return list.sort((a, b) => cost(a) - cost(b) || readingOrder(a, b))
})()

/**
 * Ordnet alle Kurse an: jeder kommt an die nächstgelegene Stelle, an der
 * sein Gebiet mit mindestens einer freien Zelle Abstand zu allen anderen passt.
 */
export function layoutCourses(courses: { id: string; tileCount: number }[]): CourseLayout[] {
  const occupied = new Set<string>()
  const result: CourseLayout[] = []
  for (const course of courses) {
    const base = buildCourse(course.id, course.tileCount)
    const own = [...base.tiles, ...base.territory]
    // Zelle in der Mitte der Kacheln als Anker
    const mx = base.tiles.reduce((s, c) => s + cellCenter(c).x, 0) / base.tiles.length
    const my = base.tiles.reduce((s, c) => s + cellCenter(c).y, 0) / base.tiles.length
    const anchor = [...base.tiles].sort((a, b) => {
      const pa = cellCenter(a)
      const pb = cellCenter(b)
      return (pa.x - mx) ** 2 + (pa.y - my) ** 2 - ((pb.x - mx) ** 2 + (pb.y - my) ** 2)
    })[0]
    // Alles, was frei sein muss: eigene Zellen und ihre Nachbarn (= eine Zelle Abstand)
    const haloKeys = new Set<string>()
    const halo: Cell[] = []
    for (const cell of own) {
      for (const c of [cell, ...neighbors(cell)]) {
        const key = cellKey(c)
        if (!haloKeys.has(key)) haloKeys.add(key), halo.push(c)
      }
    }
    const fits = (dq: number, dr: number) => halo.every((c) => !occupied.has(cellKey({ q: c.q + dq, r: c.r + dr })))

    let shift = { q: 0, r: (result.length + 1) * 200 }
    for (const target of SHIFTS) {
      const dq = target.q - anchor.q
      const dr = target.r - anchor.r
      if (fits(dq, dr)) {
        shift = { q: dq, r: dr }
        break
      }
    }
    const move = (c: Cell) => ({ q: c.q + shift.q, r: c.r + shift.r })
    const placed: CourseLayout = {
      id: course.id,
      tiles: base.tiles.map(move),
      territory: base.territory.map(move),
      decor: base.decor.map(move),
    }
    for (const c of [...placed.tiles, ...placed.territory]) occupied.add(cellKey(c))
    result.push(placed)
  }
  return result
}

/** Umrandendes Rechteck von Zellen in Kartenpixeln */
export function cellBounds(cells: Cell[]) {
  const xs = cells.map((c) => cellCenter(c).x)
  const ys = cells.map((c) => cellCenter(c).y)
  const minX = Math.min(...xs) - CELL / 2
  const maxX = Math.max(...xs) + CELL / 2
  const minY = Math.min(...ys) - CELL_HEIGHT / 2
  const maxY = Math.max(...ys) + CELL_HEIGHT / 2
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

// ---------------------------------------------------------------------------
// Zeichen in einer Kachel: ein Kreis je Leseseite, ein Schild je Frage

/** Maße der Zeichenreihen in Kartenpixeln (bei Maßstab 1) */
export const MARK = { pitch: 8.4, size: 6.2, pad: 2.6, height: 11, gap: 3 }
/** Höchstens so viele Zeichen nebeneinander */
const MAX_PER_ROW = 6

const rowWidth = (k: number) => k * MARK.pitch - (MARK.pitch - MARK.size) + 2 * MARK.pad

/** Größter Maßstab, bei dem alle Reihen ins Sechseck der Breite `width` passen */
function fitScale(rows: number[], width: number): number {
  const half = (width * 0.84) / 2
  const tip = (width * 0.84) / Math.sqrt(3)
  // Halbe Breite des Sechsecks in der Höhe y: an den senkrechten Kanten voll, zu den Spitzen hin schmaler
  const halfAt = (y: number) => (y <= tip / 2 ? half : (half * 2 * (tip - y)) / tip)
  const fits = (s: number) => {
    const total = s * (rows.length * MARK.height + (rows.length - 1) * MARK.gap)
    return rows.every((k, i) => {
      const top = -total / 2 + i * s * (MARK.height + MARK.gap)
      const far = Math.max(Math.abs(top), Math.abs(top + s * MARK.height))
      return (s * rowWidth(k)) / 2 <= halfAt(far)
    })
  }
  let lo = 0.1
  let hi = 1
  if (fits(hi)) return hi
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return lo
}

/**
 * Verteilt `count` Zeichen auf Reihen (vorne voller) und bestimmt den Maßstab.
 * Bevorzugt wenige, breite Reihen, solange die Zeichen groß genug bleiben.
 */
export function markRows(count: number, width: number): { rows: number[]; scale: number } {
  if (count <= 0) return { rows: [], scale: 1 }
  let best: { rows: number[]; scale: number } | null = null
  for (let rowCount = 1; rowCount <= count; rowCount++) {
    const perRow = Math.ceil(count / rowCount)
    if (perRow > MAX_PER_ROW) continue
    const rows: number[] = []
    let left = count
    for (let i = rowCount; i > 0; i--) {
      const k = Math.ceil(left / i)
      rows.push(k)
      left -= k
    }
    const scale = fitScale(rows, width)
    if (scale >= 0.85) return { rows, scale }
    if (!best || scale > best.scale) best = { rows, scale }
  }
  return best!
}
