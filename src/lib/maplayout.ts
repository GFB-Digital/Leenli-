// Geometrie der Wissenskarte: Sechsecke (Spitze oben), die lückenlos aneinanderliegen.
//
// Die Zeilen sind um eine halbe Zelle versetzt; jede Zelle hat sechs Nachbarn.
// Gerechnet wird mit axialen Koordinaten (q, r) wie bei üblichen Sechseck-Karten.
//
// Jeder Kurs ist eine Gruppe aus Kacheln, die Zelle für Zelle „wächst“ – zufällig,
// aber mit festem Startwert aus der Kurs-ID. So sieht jede Gruppe anders aus,
// bleibt aber bei jedem Öffnen gleich, und neue Kacheln hängen sich an, ohne
// die alten zu verschieben. Zwischen zwei Kursen bleiben immer drei Zellen frei.
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

export function hexagonCorners(cx: number, cy: number, width: number): [number, number][] {
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

/** Kachel-Reihenfolge für gleich gute Kandidaten: zeilenweise von oben links */
function readingOrder(a: Cell, b: Cell): number {
  return a.r - b.r || a.q + a.r / 2 - (b.q + b.r / 2)
}

/**
 * Kacheln eines Kurses als gewachsene Gruppe: Die erste Kachel liegt im Ursprung,
 * jede weitere dockt an einer freien Nachbarzelle an. Bevorzugt werden Zellen mit
 * vielen belegten Nachbarn (die Gruppe bleibt kompakt) und Zellen neben der
 * zuletzt gesetzten Kachel (der Lernweg schlängelt sich durch die Gruppe).
 *
 * Gleicher Startwert → gleiche Gruppe. Die ersten n Zellen hängen nicht davon ab,
 * wie viele danach noch kommen: Eine zusätzliche Kachel verschiebt keine alte.
 */
export function growCells(seed: string, count: number): Cell[] {
  const n = Math.max(1, count)
  const random = seededRandom(seed)
  const cells: Cell[] = [{ q: 0, r: 0 }]
  const taken = new Set([cellKey(cells[0])])
  while (cells.length < n) {
    const last = cells[cells.length - 1]
    // Freie Nachbarzellen und wie viele belegte Nachbarn sie haben
    const touching = new Map<string, { cell: Cell; count: number }>()
    for (const cell of cells) {
      for (const c of neighbors(cell)) {
        const key = cellKey(c)
        if (taken.has(key)) continue
        const entry = touching.get(key)
        if (entry) entry.count++
        else touching.set(key, { cell: c, count: 1 })
      }
    }
    const candidates = [...touching.values()].sort((x, y) => readingOrder(x.cell, y.cell))
    // Fast eingeschlossene Zellen zuerst füllen → keine Löcher in der Gruppe
    const pit = candidates.find((c) => c.count >= 5)
    let chosen = pit?.cell
    if (!chosen) {
      const weights = candidates.map((c) => c.count ** 2 * (cellDistance(c.cell, last) === 1 ? 3 : 1))
      let pick = random() * weights.reduce((sum, w) => sum + w, 0)
      chosen = candidates[candidates.length - 1].cell
      for (let i = 0; i < candidates.length; i++) {
        pick -= weights[i]
        if (pick < 0) {
          chosen = candidates[i].cell
          break
        }
      }
    }
    cells.push(chosen)
    taken.add(cellKey(chosen))
  }
  return cells
}

export interface CourseLayout {
  id: string
  /** Zellen der Kacheln in Kachel-Reihenfolge (absolut) */
  tiles: Cell[]
}

/** Freie Zellen zwischen zwei Kursen (Platz für Namen, hohe Säulen verdecken keinen Nachbarkurs) */
export const COURSE_GAP = 3

/** Alle Zellen im Umkreis von `distance` Schritten (ohne die Mitte) */
function ring(distance: number): Cell[] {
  const list: Cell[] = []
  for (let r = -distance; r <= distance; r++) {
    for (let q = -distance; q <= distance; q++) {
      const d = cellDistance({ q, r }, { q: 0, r: 0 })
      if (d > 0 && d <= distance) list.push({ q, r })
    }
  }
  return list
}

const GAP_OFFSETS = ring(COURSE_GAP)

/** Mögliche Verschiebungen, nach Abstand zur Mitte sortiert (hochkant bevorzugt, passt zum Handy) */
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
 * Ordnet alle Kurse an: Jeder kommt an die nächstgelegene Stelle, an der er mit
 * drei freien Zellen Abstand zu allen früheren passt. Kurse mit demselben
 * Themengebiet (`group`) suchen ihren Platz rund um den ersten Kurs des Gebiets.
 * Ein Kurs, der hinten dazukommt, verschiebt keinen früheren.
 */
export function layoutCourses(courses: { id: string; tileCount: number; group?: string }[]): CourseLayout[] {
  const occupied = new Set<string>()
  const groupCenter = new Map<string, Cell>()
  const result: CourseLayout[] = []
  for (const course of courses) {
    const base = growCells(course.id, course.tileCount)
    // Alles, was frei sein muss: die eigenen Zellen und ihr Umkreis
    const haloKeys = new Set<string>()
    const halo: Cell[] = []
    for (const cell of base) {
      for (const c of [{ q: 0, r: 0 }, ...GAP_OFFSETS]) {
        const moved = { q: cell.q + c.q, r: cell.r + c.r }
        const key = cellKey(moved)
        if (!haloKeys.has(key)) haloKeys.add(key), halo.push(moved)
      }
    }
    const fits = (dq: number, dr: number) => halo.every((c) => !occupied.has(cellKey({ q: c.q + dq, r: c.r + dr })))

    const center = (course.group && groupCenter.get(course.group)) || { q: 0, r: 0 }
    let shift = { q: 0, r: (result.length + 1) * 200 }
    for (const target of SHIFTS) {
      const dq = center.q + target.q
      const dr = center.r + target.r
      if (fits(dq, dr)) {
        shift = { q: dq, r: dr }
        break
      }
    }
    if (course.group && !groupCenter.has(course.group)) groupCenter.set(course.group, shift)
    const tiles = base.map((c) => ({ q: c.q + shift.q, r: c.r + shift.r }))
    for (const c of tiles) occupied.add(cellKey(c))
    result.push({ id: course.id, tiles })
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
