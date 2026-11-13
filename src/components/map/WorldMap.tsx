import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { courseColor } from '../../lib/colors.ts'
import { CELL, MARK, cellCenter, layoutCourses, markRows, hexagonPoints, type CourseLayout } from '../../lib/maplayout.ts'
import {
  columnHeight,
  depth,
  keepInView,
  planeTransform,
  projectedBounds,
  rotateView,
  shadowPath,
  sideFaces,
  placeLabels,
  smoothstep,
  type View3,
} from '../../lib/map3d.ts'
import { tileMastery, type TileMastery } from '../../lib/mastery.ts'
import { nextTile } from '../../lib/model.ts'
import { isQuestion, type Course, type LearnState, type Tile } from '../../lib/types.ts'
import { useKeydown } from '../../lib/useKeydown.ts'

const MIN_K = 0.15
const MAX_K = 4
/** Beim Einpassen höchstens so weit hineinzoomen */
const FIT_MAX_K = 2
/** Bewegung (px), bis aus einem Tippen ein Ziehen wird */
const TAP_SLOP = 8
/** Drehung der Finger (Bogenmaß), ab der gedreht wird – sonst dreht Zoomen versehentlich mit */
const TWIST_START = (12 * Math.PI) / 180
/** So viele Pixel der Karte bleiben beim Verschieben mindestens im Bild */
const KEEP_VISIBLE = 90
/**
 * Zeichen in den Kacheln (Kreis = Seite, Schild = Frage), nach Bildschirmgröße einer Zelle:
 * ab `mount` vorhanden, zwischen `from` und `to` blenden sie stufenlos ein.
 */
const MARKS = { mount: 46, from: 54, to: 82 }
/** Häkchen auf gelernten Kacheln: blendet beim Hineinzoomen ein und weicht dann den Zeichen */
const CHECK = { from: 16, to: 26 }
/** Höhe eines Kursnamens auf dem Bildschirm (px), für die Platzsuche */
const LABEL_HEIGHT = 38
/** Weit herausgezoomt (Zelle kleiner als so viele px) werden die Kursnamen kleiner */
const LABEL_SMALL_BELOW = 40
/** Säulen wachsen nach einer Sitzung: kurze Pause, dann weich auf die neue Höhe */
const GROW = { delay: 350, duration: 800 }
/** Nachgleiten nach dem Loslassen: Abklingzeit (ms) und Mindesttempo (px/ms) */
const GLIDE = { decay: 280, start: 0.12, stop: 0.02 }

type View = View3

interface Insets {
  top: number
  bottom: number
}

type Box = ReturnType<typeof projectedBounds>

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function fitView(box: Box, width: number, height: number, insets: Insets): Omit<View, 'r'> {
  const pad = 24
  const availW = Math.max(80, width - 2 * pad)
  const availH = Math.max(80, height - insets.top - insets.bottom - 2 * pad)
  const k = clamp(Math.min(availW / box.width, availH / box.height), MIN_K, FIT_MAX_K)
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  return { k, x: width / 2 - cx * k, y: insets.top + pad + availH / 2 - cy * k }
}

/** Schild für eine Frage, mittig um (0, 0) */
const SHIELD = 'M0 -3.4L2.9 -2.3V0C2.9 1.8 1.7 3 0 3.6C-1.7 3 -2.9 1.8 -2.9 0V-2.3Z'

/**
 * Zeichen in einer Kachel wie in der Leiste beim Lernen: Kreis = Leseseite, Schild = Frage.
 * Ändert sich beim Drehen nicht (gedreht wird der Deckel darum herum) → memo spart dabei die meiste Arbeit.
 */
const TileContent = memo(function TileContent({ tile, x, y }: { tile: Tile; x: number; y: number }) {
  const marks = tile.steps.map((step) => isQuestion(step))
  const { rows, scale } = markRows(marks.length, CELL)
  const total = rows.length * MARK.height + (rows.length - 1) * MARK.gap
  let index = 0
  return (
    <g className="map-content" transform={`translate(${x} ${y}) scale(${scale})`}>
      {rows.map((count, row) => {
        const width = count * MARK.pitch - (MARK.pitch - MARK.size) + 2 * MARK.pad
        const top = -total / 2 + row * (MARK.height + MARK.gap)
        const cy = top + MARK.height / 2
        const items = marks.slice(index, index + count)
        index += count
        return (
          <g key={row}>
            <rect className="map-row" x={-width / 2} y={top} width={width} height={MARK.height} rx={MARK.height / 2} />
            {items.map((question, i) => {
              const cx = -width / 2 + MARK.pad + MARK.size / 2 + i * MARK.pitch
              return question ? (
                <path key={i} className="map-mark" d={SHIELD} transform={`translate(${cx} ${cy})`} />
              ) : (
                <circle key={i} className="map-mark" cx={cx} cy={cy} r={MARK.size / 2} />
              )
            })}
          </g>
        )
      })}
    </g>
  )
})

// ---------------------------------------------------------------------------
// Säulenhöhen: wachsen sichtbar, wenn sich der Lernstand geändert hat

/** Zuletzt gezeigte Höhen – bleiben erhalten, während eine Sitzung die Karte verdeckt */
const shownHeights = new Map<string, number>()

function useGrowingHeights(keys: string[][], targets: number[][]): number[][] {
  const [anim, setAnim] = useState<{ from: number[][]; t: number } | null>(null)

  useLayoutEffect(() => {
    const from = targets.map((row, c) => row.map((h, t) => shownHeights.get(keys[c][t]) ?? h))
    const remember = () => targets.forEach((row, c) => row.forEach((h, t) => shownHeights.set(keys[c][t], h)))
    const changed = from.some((row, c) => row.some((h, t) => Math.abs(h - targets[c][t]) > 0.5))
    if (!changed || reducedMotion()) {
      remember()
      setAnim(null)
      return
    }
    setAnim({ from, t: 0 })
    const start = performance.now() + GROW.delay
    let frame = requestAnimationFrame(function step(now: number) {
      const t = clamp((now - start) / GROW.duration, 0, 1)
      if (t < 1) {
        setAnim({ from, t })
        frame = requestAnimationFrame(step)
      } else {
        remember()
        setAnim(null)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [keys, targets])

  return useMemo(() => {
    if (!anim) return targets
    const e = 1 - Math.pow(1 - anim.t, 3)
    return targets.map((row, c) =>
      row.map((h, t) => {
        const from = anim.from[c]?.[t] ?? h
        return from + (h - from) * e
      }),
    )
  }, [anim, targets])
}

// ---------------------------------------------------------------------------
// Alle Säulen – neu gezeichnet nur bei geänderten Inhalten, Höhen oder Drehung

const MapLayer = memo(function MapLayer({
  layout,
  courses,
  learn,
  masteries,
  heights,
  showMarks,
  selectedId,
  rot,
}: {
  layout: CourseLayout[]
  courses: Course[]
  learn: LearnState
  masteries: TileMastery[][]
  heights: number[][]
  showMarks: boolean
  selectedId?: string
  rot: number
}) {
  const ground = planeTransform(0, rot)
  const courseClass = (id: string) =>
    selectedId === id ? 'map-course map-course--selected' : selectedId ? 'map-course map-course--dim' : 'map-course'

  // Alle Säulen aller Kurse von hinten nach vorne – vordere verdecken hintere
  const columns = layout
    .flatMap((course, c) =>
      course.tiles.map((cell, t) => ({
        course: courses[c],
        tile: courses[c].tiles[t],
        state: masteries[c][t],
        h: heights[c][t],
        ...cellCenter(cell),
      })),
    )
    .sort((a, b) => depth(a.x, a.y, rot) - depth(b.x, b.y, rot))
  const nextIds = new Set(courses.map((course) => `${course.id}/${nextTile(course, learn)?.id}`))

  return (
    <g className="map3d">
      {/* Boden: Schatten der Säulen, flach gedreht und gekippt */}
      {layout.map((course, c) => (
        <g key={course.id} className={courseClass(course.id)}>
          <path
            className="map-shadow"
            transform={ground}
            d={course.tiles
              .map((cell, t) => {
                const { x, y } = cellCenter(cell)
                return shadowPath(x, y, CELL, heights[c][t], rot)
              })
              .join('')}
          />
        </g>
      ))}

      {columns.map(({ course, tile, state, h, x, y }) => {
        const lid = hexagonPoints(x, y, CELL)
        return (
          <g
            key={`${course.id}/${tile.id}`}
            data-course={course.id}
            className={courseClass(course.id)}
            style={{ '--course': courseColor(course) } as CSSProperties}
          >
            <g data-tile={tile.id} className={`map-tile map-tile--${state.status}${state.due ? ' map-tile--due' : ''}`}>
              {sideFaces(x, y, CELL, h, rot).map((face, i) => (
                <polygon
                  key={i}
                  className="map-col-side"
                  points={face.points}
                  style={{ '--shade': `${Math.round(8 + face.shade * 40)}%` } as CSSProperties}
                />
              ))}
              {/* Deckel in der Höhe der Säule, darauf die Zeichen */}
              <g transform={planeTransform(h, rot)}>
                <polygon className="map-tile-shape" points={lid} />
                {showMarks && state.status === 'done' && <polygon className="map-tile-wash" points={lid} />}
                {state.status === 'done' && !state.due && (
                  <path className="map-tile-check" d={`M${x - 10} ${y + 1} l7 7 l13 -14`} />
                )}
                {showMarks && <TileContent tile={tile} x={x} y={y} />}
                {nextIds.has(`${course.id}/${tile.id}`) && <polygon className="map-next-ring" points={hexagonPoints(x, y, CELL - 3)} />}
              </g>
            </g>
          </g>
        )
      })}
    </g>
  )
})

// ---------------------------------------------------------------------------

export function WorldMap({
  courses,
  learn,
  selectedId,
  insets,
  sheetOpen,
  onSelectCourse,
  onSelectTile,
  onBackground,
}: {
  courses: Course[]
  learn: LearnState
  selectedId?: string
  insets: Insets
  sheetOpen: boolean
  onSelectCourse: (courseId: string) => void
  onSelectTile: (courseId: string, tileId: string) => void
  onBackground: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const sizeRef = useRef(size)
  sizeRef.current = size
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1, r: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const animation = useRef<number | null>(null)

  const layout = useMemo(
    () => layoutCourses(courses.map((c) => ({ id: c.id, tileCount: c.tiles.length, group: c.group }))),
    [courses],
  )
  const keys = useMemo(() => courses.map((course) => course.tiles.map((tile) => `${course.id}/${tile.id}`)), [courses])
  // Lernstand jeder Kachel → Höhe ihrer Säule
  const masteries = useMemo(() => {
    const now = Date.now()
    return courses.map((course) => course.tiles.map((tile) => tileMastery(course, tile, learn, now)))
  }, [courses, learn])
  const targetHeights = useMemo(() => masteries.map((row) => row.map((m) => columnHeight(m.mastery))), [masteries])
  const heights = useGrowingHeights(keys, targetHeights)

  /** Umrandendes Rechteck von Kursen samt Säulen bei Drehung `rot` (Kartenebene) */
  const boundsOf = useCallback(
    (courseIndexes: number[], rot: number) =>
      projectedBounds(
        courseIndexes.flatMap((i) => layout[i].tiles),
        courseIndexes.flatMap((i) => targetHeights[i]),
        rot,
      ),
    [layout, targetHeights],
  )
  const allIndexes = useMemo(() => layout.map((_, i) => i), [layout])
  // Eingepasst wird auf die Säulen mit etwas Rand
  const allBounds = useMemo(() => {
    const box = boundsOf(allIndexes, 0)
    const pad = CELL
    return { minX: box.minX - pad, minY: box.minY - pad, maxX: box.maxX + pad, maxY: box.maxY + pad, width: box.width + 2 * pad, height: box.height + 2 * pad }
  }, [allIndexes, boundsOf])
  // Nicht weiter herauszoomen als auf die halbe Größe der eingepassten Karte
  const minK = useMemo(
    () => (size.width === 0 ? MIN_K : Math.max(MIN_K, fitView(allBounds, size.width, size.height, insets).k * 0.5)),
    [allBounds, size, insets],
  )

  /** Ansicht ändern; die Karte bleibt dabei immer teilweise im Bild */
  const update = useCallback(
    (change: (v: View) => View) => {
      setView((v) => {
        const next = change(v)
        const { width, height } = sizeRef.current
        return width === 0 ? next : keepInView(next, boundsOf(allIndexes, next.r), width, height, KEEP_VISIBLE)
      })
    },
    [boundsOf, allIndexes],
  )

  const stopMotion = () => {
    if (animation.current) cancelAnimationFrame(animation.current)
    animation.current = null
  }

  // ---- Größe beobachten ----
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => stopMotion, [])

  // ---- Sanft zu einer Ansicht fahren ----
  const animateTo = useCallback((target: View, duration = 420) => {
    stopMotion()
    const from = viewRef.current
    if (reducedMotion() || duration === 0) {
      setView(target)
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      setView({
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        k: Math.exp(Math.log(from.k) + (Math.log(target.k) - Math.log(from.k)) * e),
        r: from.r + (target.r - from.r) * e,
      })
      animation.current = t < 1 ? requestAnimationFrame(step) : null
    }
    animation.current = requestAnimationFrame(step)
  }, [])

  // Erstes Einpassen, sobald die Größe bekannt ist
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || size.width === 0) return
    fitted.current = true
    setView({ ...fitView(allBounds, size.width, size.height, insets), r: 0 })
  }, [size, allBounds, insets])

  // Kurs gewählt → hinfahren, oberhalb des Kursblatts
  useEffect(() => {
    if (!selectedId || size.width === 0) return
    const index = layout.findIndex((c) => c.id === selectedId)
    if (index < 0) return
    const rot = viewRef.current.r
    const box = boundsOf([index], rot)
    const padded = { ...box, minX: box.minX - CELL / 2, maxX: box.maxX + CELL / 2, minY: box.minY - CELL, maxY: box.maxY + CELL / 2 }
    padded.width = padded.maxX - padded.minX
    padded.height = padded.maxY - padded.minY
    const bottom = sheetOpen ? size.height * 0.62 : insets.bottom
    animateTo({ ...fitView(padded, size.width, size.height, { top: insets.top - 30, bottom }), r: rot })
  }, [selectedId, sheetOpen, layout, boundsOf, size, insets, animateTo])

  // ---- Zoomen und Drehen um einen Punkt ----
  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      update((v) => {
        const k = clamp(v.k * factor, minK, MAX_K)
        const f = k / v.k
        return { ...v, k, x: px - (px - v.x) * f, y: py - (py - v.y) * f }
      })
    },
    [update, minK],
  )

  const rotateAt = useCallback(
    (px: number, py: number, delta: number) => update((v) => rotateView(v, px, py, delta)),
    [update],
  )

  /** Weich um `total` drehen (um die Bildschirmmitte); `north` rastet am Ende genau auf Norden ein */
  const turnBy = (total: number, north = false) => {
    stopMotion()
    const cx = size.width / 2
    const cy = size.height / 2
    const finish = (v: View) => (north ? { ...v, r: 0 } : v)
    if (reducedMotion()) return update((v) => finish(rotateView(v, cx, cy, total)))
    const start = performance.now()
    let done = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 380)
      const e = 1 - Math.pow(1 - t, 3)
      const delta = total * e - done
      done = total * e
      update((v) => (t === 1 ? finish(rotateView(v, cx, cy, delta)) : rotateView(v, cx, cy, delta)))
      animation.current = t < 1 ? requestAnimationFrame(step) : null
    }
    animation.current = requestAnimationFrame(step)
  }

  /** Kompass: auf dem kürzesten Weg zurück nach Norden */
  const resetRotation = () => {
    const from = viewRef.current.r
    turnBy(-(((from % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI), true)
  }

  /** Weich um die Bildschirmmitte zoomen (Tasten, Doppeltippen) */
  const zoomBy = (factor: number, px = size.width / 2, py = size.height / 2) => {
    const v = viewRef.current
    const k = clamp(v.k * factor, minK, MAX_K)
    animateTo({ k, r: v.r, x: px - (px - v.x) * (k / v.k), y: py - (py - v.y) * (k / v.k) }, 260)
  }

  /** Nach dem Loslassen gleitet die Karte kurz weiter */
  const glide = (vx: number, vy: number) => {
    if (reducedMotion()) return
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(40, now - last)
      last = now
      update((v) => ({ ...v, x: v.x + vx * dt, y: v.y + vy * dt }))
      const decay = Math.exp(-dt / GLIDE.decay)
      vx *= decay
      vy *= decay
      animation.current = Math.hypot(vx, vy) > GLIDE.stop ? requestAnimationFrame(step) : null
    }
    animation.current = requestAnimationFrame(step)
  }

  // Mausrad / Trackpad (braucht einen nicht-passiven Listener)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      stopMotion()
      const rect = el.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      if (event.shiftKey) {
        // Umschalt + Mausrad dreht; manche Browser melden das als waagrechtes Scrollen
        rotateAt(px, py, (event.deltaY || event.deltaX) * 0.004)
        return
      }
      const speed = event.ctrlKey ? 0.01 : 0.0015 // Trackpad-Pinch meldet sich mit ctrlKey
      zoomAt(px, py, Math.exp(-event.deltaY * speed))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, rotateAt])

  // Tastatur am PC: Pfeile verschieben, + / − zoomen, Q / E drehen, N = Norden
  useKeydown((event) => {
    const pans: Record<string, [number, number] | undefined> = { ArrowLeft: [70, 0], ArrowRight: [-70, 0], ArrowUp: [0, 70], ArrowDown: [0, -70] }
    const pan = pans[event.key]
    if (pan) {
      event.preventDefault()
      stopMotion()
      update((v) => ({ ...v, x: v.x + pan[0], y: v.y + pan[1] }))
    } else if (event.key === '+' || event.key === '=') zoomBy(1.4)
    else if (event.key === '-') zoomBy(1 / 1.4)
    else if (event.key === 'q' || event.key === 'Q') turnBy(-Math.PI / 6)
    else if (event.key === 'e' || event.key === 'E') turnBy(Math.PI / 6)
    else if (event.key === 'n' || event.key === 'N') resetRotation()
  }, !sheetOpen)

  // ---- Ziehen, Zwei-Finger-Zoom, Drehen, Tippen ----
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    moved: number
    target: Element | null
    time: number
    twist: number
    rotating: boolean
    /** Maus mit rechter Taste oder Umschalt: Ziehen dreht die Karte um diesen Punkt */
    turn: { x: number; y: number } | null
    vx: number
    vy: number
    lastMove: number
  } | null>(null)
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)

  const local = (event: ReactPointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('.map-label, .map-compass')) return
    stopMotion()
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = local(event)
    pointers.current.set(event.pointerId, point)
    if (pointers.current.size === 1) {
      const turn = event.pointerType === 'mouse' && (event.button === 2 || event.shiftKey) ? point : null
      gesture.current = {
        moved: 0,
        target: event.target as Element,
        time: performance.now(),
        twist: 0,
        rotating: false,
        turn,
        vx: 0,
        vy: 0,
        lastMove: event.timeStamp,
      }
    } else if (gesture.current) {
      gesture.current.moved = Infinity // zwei Finger → kein Tippen
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    const current = local(event)
    const g = gesture.current
    if (pointers.current.size === 1) {
      const dx = current.x - previous.x
      const dy = current.y - previous.y
      if (g) {
        g.moved += Math.hypot(dx, dy)
        const dt = Math.max(1, event.timeStamp - g.lastMove)
        g.vx = 0.7 * (dx / dt) + 0.3 * g.vx
        g.vy = 0.7 * (dy / dt) + 0.3 * g.vy
        g.lastMove = event.timeStamp
      }
      if (g?.turn) rotateAt(g.turn.x, g.turn.y, dx * 0.008)
      else update((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
    } else if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1]
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y)
        const after = Math.hypot(current.x - other.x, current.y - other.y)
        const mid = { x: (current.x + other.x) / 2, y: (current.y + other.y) / 2 }
        const midBefore = { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 }
        if (before > 0) zoomAt(mid.x, mid.y, after / before)
        update((v) => ({ ...v, x: v.x + mid.x - midBefore.x, y: v.y + mid.y - midBefore.y }))
        // Finger drehen → Karte drehen (erst ab einer Mindestdrehung, dann direkt)
        if (g && before > 0) {
          const angle = (a: { x: number; y: number }) => Math.atan2(a.y - other.y, a.x - other.x)
          let delta = angle(current) - angle(previous)
          if (delta > Math.PI) delta -= 2 * Math.PI
          if (delta < -Math.PI) delta += 2 * Math.PI
          if (g.rotating) rotateAt(mid.x, mid.y, delta)
          else if (Math.abs((g.twist += delta)) > TWIST_START) {
            g.rotating = true
            rotateAt(mid.x, mid.y, g.twist)
          }
        }
      }
    }
    pointers.current.set(event.pointerId, current)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointers.current.get(event.pointerId)
    pointers.current.delete(event.pointerId)
    const g = gesture.current
    if (pointers.current.size > 0 || !g || !point) return
    gesture.current = null
    if (g.moved > TAP_SLOP || performance.now() - g.time > 600) {
      // Mit Schwung losgelassen → kurz weitergleiten (nicht nach Zoomen oder Drehen)
      const fresh = event.timeStamp - g.lastMove < 80
      if (fresh && !g.turn && Number.isFinite(g.moved) && Math.hypot(g.vx, g.vy) > GLIDE.start) glide(g.vx, g.vy)
      return
    }

    // Doppeltippen → hineinzoomen
    const now = performance.now()
    const prev = lastTap.current
    if (prev && now - prev.time < 320 && Math.hypot(point.x - prev.x, point.y - prev.y) < 30) {
      lastTap.current = null
      zoomBy(1.8, point.x, point.y)
      return
    }
    lastTap.current = { time: now, x: point.x, y: point.y }

    const tileEl = g.target?.closest('[data-tile]')
    const courseId = g.target?.closest('[data-course]')?.getAttribute('data-course')
    if (courseId && tileEl && selectedId === courseId) onSelectTile(courseId, tileEl.getAttribute('data-tile')!)
    else if (courseId) onSelectCourse(courseId)
    else onBackground()
  }

  // Stufenlose Details: je größer eine Zelle auf dem Bildschirm, desto mehr ist zu sehen
  const cellPx = CELL * view.k
  const marks = smoothstep(MARKS.from, MARKS.to, cellPx)
  const detailStyle = {
    '--marks': marks.toFixed(3),
    '--check': (smoothstep(CHECK.from, CHECK.to, cellPx) * (1 - marks)).toFixed(3),
  } as CSSProperties

  // Kursnamen: über der Gruppe, sonst darunter. Vorfahrt haben der gewählte Kurs
  // und dann die größeren; wer nirgends Platz hat, blendet aus.
  const smallLabels = cellPx < LABEL_SMALL_BELOW
  const labelScale = smallLabels ? 0.82 : 1
  const labelOptions = layout.map((_, i) => {
    const box = boundsOf([i], view.r)
    const x = ((box.minX + box.maxX) / 2) * view.k + view.x
    const width = Math.min(size.width * 0.72, (courses[i].title.length * 9.5 + 30) * labelScale)
    const height = LABEL_HEIGHT * labelScale
    const above = (box.minY - 8) * view.k + view.y + 10 - height
    const below = (box.maxY + 8) * view.k + view.y - 4
    return [above, below].map((top) => ({ x, top, width, height }))
  })
  const selectedIndex = layout.findIndex((c) => c.id === selectedId)
  const labelOrder = [...allIndexes].sort(
    (a, b) =>
      Number(b === selectedIndex) - Number(a === selectedIndex) || layout[b].tiles.length - layout[a].tiles.length || a - b,
  )
  const labelPlace = placeLabels(labelOptions, labelOrder)

  return (
    <div
      ref={containerRef}
      className="worldmap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(event) => event.preventDefault()}
    >
      <svg className="worldmap-svg" width={size.width} height={size.height} aria-hidden="true">
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} style={detailStyle}>
          <MapLayer
            layout={layout}
            courses={courses}
            learn={learn}
            masteries={masteries}
            heights={heights}
            showMarks={cellPx >= MARKS.mount}
            selectedId={selectedId}
            rot={view.r}
          />
        </g>
      </svg>

      {/* Kursnamen als echte Buttons (auch per Tastatur erreichbar) */}
      {layout.map((course, i) => {
        const data = courses[i]
        const classes = ['map-label']
        if (smallLabels) classes.push('map-label--small')
        if (selectedId !== undefined && selectedId !== data.id) classes.push('map-label--dim')
        const place = labelPlace[i]
        if (place < 0) classes.push('map-label--hidden')
        const box = labelOptions[i][Math.max(0, place)]
        return (
          <button
            key={course.id}
            type="button"
            className={classes.join(' ')}
            style={{ left: box.x, top: box.top, '--course': courseColor(data) } as CSSProperties}
            tabIndex={place < 0 ? -1 : 0}
            onClick={() => onSelectCourse(data.id)}
          >
            {data.title}
          </button>
        )
      })}

      {/* Kompass zeigt nach Norden; Antippen dreht zurück */}
      <button
        type="button"
        className="round-btn round-btn--glass map-compass"
        aria-label="Karte nach Norden drehen"
        title="Nach Norden drehen (N)"
        onClick={resetRotation}
      >
        <svg viewBox="-12 -12 24 24" width="26" height="26" aria-hidden="true" style={{ transform: `rotate(${view.r}rad)` }}>
          <path d="M0 -10 L4.5 0 H-4.5 Z" fill="currentColor" />
          <path d="M0 10 L4.5 0 H-4.5 Z" fill="currentColor" opacity="0.4" />
        </svg>
      </button>
    </div>
  )
}
