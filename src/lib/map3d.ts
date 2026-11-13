// Wissenskarte in 3D: Kacheln als Sechseck-Säulen, leicht gekippt, drehbar.
//
// Kein echtes 3D, sondern eine einfache Projektion in die SVG-Ebene:
//   1. um den Ursprung drehen (Winkel `rot`, Bogenmaß, im Uhrzeigersinn)
//   2. nach hinten kippen: y wird mit cos(TILT) gestaucht, die Höhe z hebt um z · sin(TILT) an
// Weil nur gekippt und gedreht wird, sind von jeder Säule höchstens drei
// Seiten sichtbar, und es reicht, die Säulen von hinten nach vorne zu zeichnen.
// Reine Funktionen → map3d.test.ts.

import { CELL_HEIGHT, cellCenter, hexagonCorners, type Cell } from './maplayout.ts'

/** Feste Neigung der Ansicht (0 = senkrecht von oben) */
export const TILT = (35 * Math.PI) / 180
const COS_T = Math.cos(TILT)
const SIN_T = Math.sin(TILT)

/**
 * Säulenhöhe in Kartenpixeln (eine Zelle ist 60 breit).
 * - min: Auch eine ungelernte Kachel bleibt als flache Säule sichtbar.
 * - max: zwei Zellbreiten – eine volle Säule verdeckt höchstens die Reihe direkt dahinter.
 * - gamma < 1: Die Höhe wächst unten schneller als oben. Dort liegen die meisten
 *   Kacheln (frisch gelernt ≈ 16 %, nach einem Monat ≈ 55 %), dort sollen die
 *   Unterschiede am deutlichsten sein.
 */
export const HEIGHT = { min: 12, max: 120, gamma: 0.7 }

/**
 * Höhe einer Säule aus der Beherrschung der Kachel (0–1, siehe mastery.ts).
 * Hängt nur von der eigenen Kachel ab: Gleicher Lernstand → gleiche Höhe.
 */
export function columnHeight(mastery: number): number {
  const m = Math.min(1, Math.max(0, mastery || 0))
  return HEIGHT.min + (HEIGHT.max - HEIGHT.min) * Math.pow(m, HEIGHT.gamma)
}

export interface Point {
  x: number
  y: number
}

/** Punkt (x, y) in der Höhe z → Kartenebene (vor Verschieben/Zoomen) */
export function project(x: number, y: number, z: number, rot: number): Point {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return { x: x * c - y * s, y: (x * s + y * c) * COS_T - z * SIN_T }
}

/** Wie weit vorne ein Punkt liegt (größer = näher) → Zeichenreihenfolge */
export function depth(x: number, y: number, rot: number): number {
  return x * Math.sin(rot) + y * Math.cos(rot)
}

const fmt = (n: number) => n.toFixed(2)
const deg = (rad: number) => (rad * 180) / Math.PI

/**
 * SVG-Transform für alles, was flach in der Höhe z liegt (Boden: z = 0, Deckel: z = Höhe).
 * Wird von rechts nach links angewendet: drehen, stauchen, anheben – wie `project`.
 */
export function planeTransform(z: number, rot: number): string {
  return `translate(0 ${fmt(-z * SIN_T)}) scale(1 ${fmt(COS_T)}) rotate(${fmt(deg(rot))})`
}

/** Licht von links, leicht von vorne (Richtung zur Lichtquelle, in der gedrehten Ansicht) */
const LIGHT = { x: -0.92, y: 0.39 }

export interface SideFace {
  /** Eckpunkte für `<polygon points>` (Kartenebene) */
  points: string
  /** 0 = voll beleuchtet, 1 = im Schatten */
  shade: number
}

/**
 * Die sichtbaren Seitenflächen einer Säule (Sechseck mit Spitze oben, Breite `width`, Höhe `h`).
 * Sichtbar ist eine Seite, wenn sie zum Betrachter (nach unten auf dem Bildschirm) zeigt.
 */
export function sideFaces(cx: number, cy: number, width: number, h: number, rot: number): SideFace[] {
  if (h <= 0) return []
  const corners = hexagonCorners(cx, cy, width)
  const faces: SideFace[] = []
  for (let i = 0; i < 6; i++) {
    // Kante i läuft von Ecke i zu Ecke i + 1; ihre Außenseite zeigt in Richtung −60° + i · 60°
    const normal = -Math.PI / 3 + (i * Math.PI) / 3 + rot
    const ny = Math.sin(normal)
    if (ny <= 1e-6) continue
    const nx = Math.cos(normal)
    const [ax, ay] = corners[i]
    const [bx, by] = corners[(i + 1) % 6]
    const quad = [project(ax, ay, 0, rot), project(bx, by, 0, rot), project(bx, by, h, rot), project(ax, ay, h, rot)]
    const light = nx * LIGHT.x + ny * LIGHT.y
    faces.push({
      points: quad.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' '),
      shade: Math.min(1, Math.max(0, (1 - light) / 2)),
    })
  }
  return faces
}

/** Schattenwurf je Höhe-Einheit nach rechts, leicht nach vorne (in der gedrehten Ansicht) */
const SHADOW = { x: 0.45, y: 0.1 }

/** Konvexe Hülle (Andrew), Ergebnis immer im selben Drehsinn */
function convexHull(points: [number, number][]): [number, number][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list: [number, number][]) => {
    const out: [number, number][] = []
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}

/**
 * Schatten einer Säule auf dem Boden, als Teil eines SVG-Pfads in Kartenkoordinaten
 * (gezeichnet unter `planeTransform(0, rot)`). Das Licht bleibt beim Drehen fest
 * zur Ansicht, deshalb wird die Schattenrichtung zurückgedreht.
 */
export function shadowPath(cx: number, cy: number, width: number, h: number, rot: number): string {
  const c = Math.cos(-rot)
  const s = Math.sin(-rot)
  const dx = (SHADOW.x * c - SHADOW.y * s) * h
  const dy = (SHADOW.x * s + SHADOW.y * c) * h
  const base = hexagonCorners(cx, cy, width)
  const hull = convexHull([...base, ...base.map(([x, y]) => [x + dx, y + dy] as [number, number])])
  return hull.map(([x, y], i) => `${i ? 'L' : 'M'}${fmt(x)} ${fmt(y)}`).join('') + 'Z'
}

/** Umrandendes Rechteck von Säulen in der Kartenebene (Boden bis Deckel) */
export function projectedBounds(cells: Cell[], heights: number[], rot: number) {
  const radius = CELL_HEIGHT / 2 // Umkreis eines Sechsecks → passt bei jeder Drehung
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  cells.forEach((cell, i) => {
    const { x, y } = cellCenter(cell)
    const bottom = project(x, y, 0, rot)
    const top = project(x, y, heights[i] ?? 0, rot)
    minX = Math.min(minX, bottom.x - radius)
    maxX = Math.max(maxX, bottom.x + radius)
    minY = Math.min(minY, top.y - radius * COS_T)
    maxY = Math.max(maxY, bottom.y + radius * COS_T)
  })
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export interface View3 {
  x: number
  y: number
  k: number
  r: number
}

/** Ansicht um `delta` drehen, sodass der Bodenpunkt unter (px, py) an seiner Stelle bleibt */
export function rotateView(v: View3, px: number, py: number, delta: number): View3 {
  const mx = (px - v.x) / v.k
  const my = (py - v.y) / v.k / COS_T // zurück in die gedrehte, ungekippte Ebene
  const c = Math.cos(delta)
  const s = Math.sin(delta)
  const nx = mx * c - my * s
  const ny = (mx * s + my * c) * COS_T
  return { k: v.k, r: v.r + delta, x: px - nx * v.k, y: py - ny * v.k }
}

/**
 * Ansicht so verschieben, dass vom Rechteck `box` (Kartenebene) immer mindestens
 * `margin` Pixel im Bild bleiben – die Karte lässt sich nicht „verlieren“.
 */
export function keepInView<V extends { x: number; y: number; k: number }>(
  v: V,
  box: { minX: number; minY: number; maxX: number; maxY: number },
  width: number,
  height: number,
  margin: number,
): V {
  const mx = Math.min(margin, width / 2)
  const my = Math.min(margin, height / 2)
  let { x, y } = v
  if (box.maxX * v.k + x < mx) x = mx - box.maxX * v.k
  else if (box.minX * v.k + x > width - mx) x = width - mx - box.minX * v.k
  if (box.maxY * v.k + y < my) y = my - box.maxY * v.k
  else if (box.minY * v.k + y > height - my) y = height - my - box.minY * v.k
  return x === v.x && y === v.y ? v : { ...v, x, y }
}

/** Weicher Übergang von 0 (bei `from`) nach 1 (bei `to`) */
export function smoothstep(from: number, to: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

export interface LabelBox {
  /** Mitte waagrecht, Oberkante senkrecht (Bildschirm) */
  x: number
  top: number
  width: number
  height: number
}

/**
 * Beschriftungen platzieren: der Reihe nach (wichtigste zuerst) bekommt jede die
 * erste ihrer möglichen Stellen, an der sie keine schon gesetzte überdeckt.
 * Ergebnis je Beschriftung: Nummer der gewählten Stelle, oder -1 = kein Platz.
 */
export function placeLabels(options: LabelBox[][], order: number[]): number[] {
  const chosen: number[] = options.map(() => -1)
  const kept: LabelBox[] = []
  const overlaps = (a: LabelBox, b: LabelBox) =>
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 && a.top < b.top + b.height && b.top < a.top + a.height
  for (const i of order) {
    const index = options[i].findIndex((box) => !kept.some((other) => overlaps(box, other)))
    if (index < 0) continue
    chosen[i] = index
    kept.push(options[i][index])
  }
  return chosen
}
