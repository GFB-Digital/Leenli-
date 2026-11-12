// Geometrie der Wissenskarte: Achtecke in einem quadratischen Raster.
//
// Jeder Kurs ist ein Block aus Kacheln (zeilenweise in Lernreihenfolge),
// umgeben von einer Fläche („Gebiet“) mit leicht unregelmäßigem Rand.
// Die Kurse werden so angeordnet, dass sich ihre Gebiete nicht berühren.
// Reine Funktionen → maplayout.test.ts.

/** Kantenlänge einer Rasterzelle in Kartenpixeln (bei Zoom 1) */
export const CELL = 60

export interface Cell {
  col: number
  row: number
}

export const cellKey = (c: Cell) => `${c.col},${c.row}`

/** Mittelpunkt einer Zelle in Kartenpixeln */
export function cellCenter(c: Cell): { x: number; y: number } {
  return { x: c.col * CELL, y: c.row * CELL }
}

/** Eckpunkte eines regelmäßigen Achtecks mit Breite `width` (Kante zu Kante) */
export function octagonPoints(cx: number, cy: number, width: number): string {
  const h = width / 2
  const cut = width / (2 + Math.SQRT2)
  const pts = [
    [-h + cut, -h],
    [h - cut, -h],
    [h, -h + cut],
    [h, h - cut],
    [h - cut, h],
    [-h + cut, h],
    [-h, h - cut],
    [-h, -h + cut],
  ]
  return pts.map(([x, y]) => `${(cx + x).toFixed(2)},${(cy + y).toFixed(2)}`).join(' ')
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

/**
 * Kacheln zeilenweise im Block anordnen (fast quadratisch).
 * Eine unvollständige letzte Zeile wird mittig gesetzt, wenn das im Raster aufgeht.
 */
export function blockCells(count: number): Cell[] {
  const n = Math.max(1, count)
  const cols = Math.ceil(Math.sqrt(n))
  const cells: Cell[] = []
  const rows = Math.ceil(n / cols)
  for (let row = 0; row < rows; row++) {
    const inRow = Math.min(cols, n - row * cols)
    const offset = inRow < cols ? Math.floor((cols - inRow) / 2) : 0
    for (let col = 0; col < inRow; col++) cells.push({ col: col + offset, row })
  }
  return cells
}

/** Chebyshev-Abstand (Schachkönig-Schritte) einer Zelle zur nächsten Kachel */
function distanceToBlock(c: Cell, tiles: Cell[]): number {
  let best = Infinity
  for (const t of tiles) best = Math.min(best, Math.max(Math.abs(c.col - t.col), Math.abs(c.row - t.row)))
  return best
}

export interface CourseLayout {
  id: string
  /** Zellen der Kacheln in Kachel-Reihenfolge (absolut) */
  tiles: Cell[]
  /** Zellen der umgebenden Fläche (absolut, ohne Kacheln) */
  territory: Cell[]
}

/** Block + Gebiet eines Kurses, relativ zum Ursprung */
function buildCourse(id: string, tileCount: number): CourseLayout {
  const random = seededRandom(id)
  const tiles = blockCells(tileCount)
  const used = new Set(tiles.map(cellKey))
  const maxCol = Math.max(...tiles.map((t) => t.col))
  const maxRow = Math.max(...tiles.map((t) => t.row))
  const territory: Cell[] = []
  for (let row = -2; row <= maxRow + 2; row++) {
    for (let col = -2; col <= maxCol + 2; col++) {
      const cell = { col, row }
      if (used.has(cellKey(cell))) continue
      const d = distanceToBlock(cell, tiles)
      // Direkt um die Kacheln geschlossen, außen ausgefranst → natürliche Form ohne Löcher
      if (d <= 1 || (d === 2 && random() < 0.55)) territory.push(cell)
    }
  }
  return { id, tiles, territory }
}

function rectOf(cells: Cell[]) {
  return {
    minCol: Math.min(...cells.map((c) => c.col)),
    maxCol: Math.max(...cells.map((c) => c.col)),
    minRow: Math.min(...cells.map((c) => c.row)),
    maxRow: Math.max(...cells.map((c) => c.row)),
  }
}

/** Mögliche Mittelpunkte, nach Nähe zum Ursprung sortiert (hochkant bevorzugt) */
const CANDIDATES: Cell[] = (() => {
  const list: Cell[] = []
  for (let row = -60; row <= 60; row++) for (let col = -60; col <= 60; col++) list.push({ col, row })
  const cost = (c: Cell) => c.col * c.col * 1.8 + c.row * c.row
  return list.sort((a, b) => cost(a) - cost(b))
})()

/**
 * Ordnet alle Kurse an: jeder kommt an die nächstgelegene Stelle, an der
 * sein Gebiet mit mindestens einer freien Zelle Abstand zu allen anderen passt.
 */
export function layoutCourses(courses: { id: string; tileCount: number }[]): CourseLayout[] {
  type Rect = ReturnType<typeof rectOf>
  const placed: { layout: CourseLayout; rect: Rect }[] = []
  for (const course of courses) {
    const base = buildCourse(course.id, course.tileCount)
    const rect = rectOf([...base.tiles, ...base.territory])
    const fits = (dx: number, dy: number) =>
      placed.every(
        ({ rect: p }) =>
          rect.maxCol + dx + 1 < p.minCol ||
          rect.minCol + dx - 1 > p.maxCol ||
          rect.maxRow + dy + 1 < p.minRow ||
          rect.minRow + dy - 1 > p.maxRow,
      )
    const midCol = Math.floor((rect.minCol + rect.maxCol) / 2)
    const midRow = Math.floor((rect.minRow + rect.maxRow) / 2)
    let shift = { dx: 0, dy: placed.length * 200 }
    for (const c of CANDIDATES) {
      const dx = c.col - midCol
      const dy = c.row - midRow
      if (fits(dx, dy)) {
        shift = { dx, dy }
        break
      }
    }
    const move = (c: Cell) => ({ col: c.col + shift.dx, row: c.row + shift.dy })
    placed.push({
      layout: { id: course.id, tiles: base.tiles.map(move), territory: base.territory.map(move) },
      rect: {
        minCol: rect.minCol + shift.dx,
        maxCol: rect.maxCol + shift.dx,
        minRow: rect.minRow + shift.dy,
        maxRow: rect.maxRow + shift.dy,
      },
    })
  }
  return placed.map((p) => p.layout)
}

/** Umrandendes Rechteck von Zellen in Kartenpixeln */
export function cellBounds(cells: Cell[]) {
  const r = rectOf(cells)
  const minX = r.minCol * CELL - CELL / 2
  const maxX = r.maxCol * CELL + CELL / 2
  const minY = r.minRow * CELL - CELL / 2
  const maxY = r.maxRow * CELL + CELL / 2
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}
