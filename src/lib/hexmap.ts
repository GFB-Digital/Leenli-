// Geometrie der Wissenskarte (Sechsecke mit Spitze nach oben, „axiale“ Koordinaten).
// Jeder Kurs ist ein Cluster: Kacheln spiralförmig um die Mitte, darum eine
// Fläche („Region“) mit leicht unregelmäßigem Rand. Reine Funktionen → hexmap.test.ts.

export interface Axial {
  q: number
  r: number
}

export const DIRECTIONS: Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export const add = (a: Axial, b: Axial): Axial => ({ q: a.q + b.q, r: a.r + b.r })
export const scale = (a: Axial, k: number): Axial => ({ q: a.q * k, r: a.r * k })
export const keyOf = (a: Axial) => `${a.q},${a.r}`

export function distance(a: Axial, b: Axial): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2
}

/** Alle Felder mit genau `radius` Abstand zur Mitte */
export function ring(center: Axial, radius: number): Axial[] {
  if (radius === 0) return [center]
  const result: Axial[] = []
  let hex = add(center, scale(DIRECTIONS[4], radius))
  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      result.push(hex)
      hex = add(hex, DIRECTIONS[side])
    }
  }
  return result
}

/** Die ersten `count` Felder spiralförmig um die Mitte */
export function spiral(center: Axial, count: number): Axial[] {
  const result: Axial[] = []
  for (let radius = 0; result.length < count; radius++) result.push(...ring(center, radius))
  return result.slice(0, count)
}

/** Kleinster Radius, in den `count` Felder passen (1, 7, 19, 37 …) */
export function ringsFor(count: number): number {
  let radius = 0
  while (1 + 3 * radius * (radius + 1) < count) radius++
  return radius
}

/** Bildschirm-Koordinaten der Feldmitte (Sechsecke mit Spitze oben) */
export function toPixel(hex: Axial, size: number): { x: number; y: number } {
  return { x: size * Math.sqrt(3) * (hex.q + hex.r / 2), y: size * 1.5 * hex.r }
}

/** Eckpunkte für ein SVG-Polygon */
export function hexPoints(cx: number, cy: number, size: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30)
    points.push(`${(cx + size * Math.cos(angle)).toFixed(2)},${(cy + size * Math.sin(angle)).toFixed(2)}`)
  }
  return points.join(' ')
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

export interface ClusterLayout {
  id: string
  center: Axial
  /** Felder der Kacheln, in Kachel-Reihenfolge (absolut) */
  tiles: Axial[]
  /** Hintergrundfläche (absolut, ohne die Kachelfelder) */
  region: Axial[]
  /** größter Abstand eines Feldes zur Mitte */
  extent: number
}

/** Cluster eines Kurses, relativ zur Mitte (0,0) */
function buildCluster(id: string, tileCount: number): Omit<ClusterLayout, 'center'> {
  const random = seededRandom(id)
  const radius = ringsFor(Math.max(1, tileCount))
  const origin = { q: 0, r: 0 }
  const tiles = spiral(origin, Math.max(1, tileCount))
  const used = new Set(tiles.map(keyOf))
  const region: Axial[] = []
  // Rest der inneren Ringe und ein voller Rand …
  for (let r = 0; r <= radius + 1; r++) {
    for (const hex of ring(origin, r)) if (!used.has(keyOf(hex))) region.push(hex)
  }
  // … plus zufällige Ausbuchtungen für eine natürlichere Form
  for (const hex of ring(origin, radius + 2)) if (random() < 0.45) region.push(hex)
  return { id, tiles, region, extent: radius + 2 }
}

/**
 * Ordnet die Kurs-Cluster nacheinander spiralförmig an: jeder Cluster kommt
 * an die erste freie Stelle, an der er mit Abstand zu allen anderen passt.
 */
export function layoutClusters(courses: { id: string; tileCount: number }[], gap = 2): ClusterLayout[] {
  const placed: ClusterLayout[] = []
  const candidates = spiral({ q: 0, r: 0 }, 20_000)
  for (const course of courses) {
    const cluster = buildCluster(course.id, course.tileCount)
    const center =
      candidates.find((c) => placed.every((p) => distance(c, p.center) >= cluster.extent + p.extent + gap)) ??
      { q: 0, r: placed.length * 50 }
    placed.push({
      ...cluster,
      center,
      tiles: cluster.tiles.map((hex) => add(hex, center)),
      region: cluster.region.map((hex) => add(hex, center)),
    })
  }
  return placed
}

/** Umrandendes Rechteck aller Felder (in Pixeln, mit Feldgröße) */
export function bounds(hexes: Axial[], size: number) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const hex of hexes) {
    const { x, y } = toPixel(hex, size)
    minX = Math.min(minX, x - size)
    maxX = Math.max(maxX, x + size)
    minY = Math.min(minY, y - size)
    maxY = Math.max(maxY, y + size)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}
