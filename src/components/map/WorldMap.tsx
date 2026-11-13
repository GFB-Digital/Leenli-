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
import { CELL, MARK, cellBounds, cellCenter, layoutCourses, markRows, hexagonPoints, hexagonsPath, type CourseLayout } from '../../lib/maplayout.ts'
import { columnHeight, depth, planeTransform, projectedBounds, rotateView, shadowPath, sideFaces } from '../../lib/map3d.ts'
import { nextTile, tileStatus } from '../../lib/model.ts'
import { isQuestion, type Course, type LearnState, type Tile } from '../../lib/types.ts'

const MIN_K = 0.15
const MAX_K = 4
/** Beim Einpassen höchstens so weit hineinzoomen */
const FIT_MAX_K = 2
/** Bewegung (px), bis aus einem Tippen ein Ziehen wird */
const TAP_SLOP = 8
/** Gebiet minimal größer als die Zellen, damit keine haarfeinen Spalten entstehen */
const TERR = 0.6
/** 3D: Drehung der Finger (Bogenmaß), ab der gedreht wird – sonst dreht Zoomen versehentlich mit */
const TWIST_START = (12 * Math.PI) / 180

interface View {
  x: number
  y: number
  k: number
  /** Drehung (nur 3D), Bogenmaß */
  r: number
}

interface Insets {
  top: number
  bottom: number
}

type Box = ReturnType<typeof cellBounds>

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

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

/** Zeichen in einer Kachel wie in der Leiste beim Lernen: Kreis = Leseseite, Schild = Frage */
function TileContent({ tile, x, y }: { tile: Tile; x: number; y: number }) {
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
}

// ---------------------------------------------------------------------------
// Alle Flächen und Kacheln – neu gezeichnet nur bei geänderten Inhalten oder Detailstufe

const MapLayer = memo(function MapLayer({
  layout,
  courses,
  learn,
  detail,
  selectedId,
}: {
  layout: CourseLayout[]
  courses: Course[]
  learn: LearnState
  detail: 0 | 1 | 2
  selectedId?: string
}) {
  return (
    <g className={`map-d${detail}`}>
      {layout.map((course, i) => {
        const data = courses[i]
        const next = nextTile(data, learn)
        const classes = ['map-course']
        if (selectedId === data.id) classes.push('map-course--selected')
        else if (selectedId) classes.push('map-course--dim')
        return (
          <g
            key={data.id}
            data-course={data.id}
            className={classes.join(' ')}
            style={{ '--course': courseColor(data) } as CSSProperties}
          >
            {/* Gebiet: Fläche aus Sechsecken, darauf ein paar zarte Umrisse */}
            <path className="map-terr" d={hexagonsPath([...course.tiles, ...course.territory], CELL + 2 * TERR)} />
            {detail > 0 && <path className="map-terr-hex" d={hexagonsPath(course.decor, CELL * 0.84)} />}

            {/* Kacheln */}
            {course.tiles.map((cell, t) => {
              const tile = data.tiles[t]
              const status = tileStatus(learn, data.id, tile.id)
              const { x, y } = cellCenter(cell)
              const isNext = next?.id === tile.id
              return (
                <g key={tile.id} data-tile={tile.id} className={`map-tile map-tile--${status}${isNext ? ' map-tile--next' : ''}`}>
                  <polygon className="map-tile-shape" points={hexagonPoints(x, y, CELL)} />
                  {detail === 1 && status === 'done' && (
                    <path className="map-tile-check" d={`M${x - 10} ${y + 1} l7 7 l13 -14`} />
                  )}
                  {detail === 2 && <TileContent tile={tile} x={x} y={y} />}
                </g>
              )
            })}

            {/* Nächste Kachel: Ring obenauf, damit ihn die Nachbarn nicht verdecken */}
            {next && (() => {
              const { x, y } = cellCenter(course.tiles[data.tiles.indexOf(next)])
              return <polygon className="map-next-ring" points={hexagonPoints(x, y, CELL - 3)} />
            })()}
          </g>
        )
      })}
    </g>
  )
})

// ---------------------------------------------------------------------------
// 3D-Karte (Testmodus): Kacheln als Sechseck-Säulen, leicht gekippt, drehbar

const MapLayer3D = memo(function MapLayer3D({
  layout,
  courses,
  learn,
  heights,
  detail,
  selectedId,
  rot,
}: {
  layout: CourseLayout[]
  courses: Course[]
  learn: LearnState
  heights: number[][]
  detail: 0 | 1 | 2
  selectedId?: string
  rot: number
}) {
  const ground = planeTransform(0, rot)
  const courseClass = (id: string) =>
    selectedId === id ? 'map-course map-course--selected' : selectedId ? 'map-course map-course--dim' : 'map-course'

  // Alle Säulen aller Kurse von hinten nach vorne – vordere verdecken hintere
  const columns = layout
    .flatMap((course, c) =>
      course.tiles.map((cell, t) => ({ course: courses[c], tile: courses[c].tiles[t], h: heights[c][t], ...cellCenter(cell) })),
    )
    .sort((a, b) => depth(a.x, a.y, rot) - depth(b.x, b.y, rot))
  const nextIds = new Set(courses.map((course) => `${course.id}/${nextTile(course, learn)?.id}`))

  return (
    <g className={`map3d map-d${detail}`}>
      {/* Boden: Gebiet und Schatten der Säulen, flach gedreht und gekippt */}
      {layout.map((course, c) => (
        <g
          key={course.id}
          data-course={course.id}
          className={courseClass(course.id)}
          style={{ '--course': courseColor(courses[c]) } as CSSProperties}
        >
          <g transform={ground}>
            <path className="map-terr" d={hexagonsPath([...course.tiles, ...course.territory], CELL + 2 * TERR)} />
            {detail > 0 && <path className="map-terr-hex" d={hexagonsPath(course.decor, CELL * 0.84)} />}
            <path
              className="map-shadow"
              d={course.tiles
                .map((cell, t) => {
                  const { x, y } = cellCenter(cell)
                  return shadowPath(x, y, CELL, heights[c][t], rot)
                })
                .join('')}
            />
          </g>
        </g>
      ))}

      {columns.map(({ course, tile, h, x, y }) => {
        const status = tileStatus(learn, course.id, tile.id)
        return (
          <g
            key={`${course.id}/${tile.id}`}
            data-course={course.id}
            className={courseClass(course.id)}
            style={{ '--course': courseColor(course) } as CSSProperties}
          >
            <g data-tile={tile.id} className={`map-tile map-tile--${status}`}>
              {sideFaces(x, y, CELL, h, rot).map((face, i) => (
                <polygon
                  key={i}
                  className="map-side"
                  points={face.points}
                  style={{ '--shade': `${Math.round(8 + face.shade * 40)}%` } as CSSProperties}
                />
              ))}
              {/* Deckel in der Höhe der Säule, darauf die Zeichen */}
              <g transform={planeTransform(h, rot)}>
                <polygon className="map-tile-shape" points={hexagonPoints(x, y, CELL)} />
                {detail === 1 && status === 'done' && <path className="map-tile-check" d={`M${x - 10} ${y + 1} l7 7 l13 -14`} />}
                {detail === 2 && <TileContent tile={tile} x={x} y={y} />}
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
  threeD = false,
}: {
  courses: Course[]
  learn: LearnState
  selectedId?: string
  insets: Insets
  sheetOpen: boolean
  onSelectCourse: (courseId: string) => void
  onSelectTile: (courseId: string, tileId: string) => void
  onBackground: () => void
  /** Testmodus: Säulen statt flacher Kacheln */
  threeD?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1, r: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const animation = useRef<number | null>(null)

  const layout = useMemo(
    () => layoutCourses(courses.map((c) => ({ id: c.id, tileCount: c.tiles.length }))),
    [courses],
  )
  // 3D: Höhe jeder Säule (je Kurs, je Kachel); flach = 0
  const heights = useMemo(
    () => courses.map((course) => course.tiles.map((tile) => (threeD ? columnHeight(tile.steps.length) : 0))),
    [courses, threeD],
  )
  /** Umrandendes Rechteck von Kacheln, in 3D samt Säulen und Drehung */
  const boundsOf = useCallback(
    (courseIndexes: number[], rot: number) => {
      const cells = courseIndexes.flatMap((i) => layout[i].tiles)
      if (!threeD) return cellBounds(cells)
      return projectedBounds(cells, courseIndexes.flatMap((i) => heights[i]), rot)
    },
    [layout, heights, threeD],
  )
  // Eingepasst wird auf die Kacheln (mit etwas Rand) – die Flächen dürfen über den Rand laufen
  const allBounds = useMemo(() => {
    const box = boundsOf(layout.map((_, i) => i), 0)
    const pad = CELL
    return { minX: box.minX - pad, minY: box.minY - pad, maxX: box.maxX + pad, maxY: box.maxY + pad, width: box.width + 2 * pad, height: box.height + 2 * pad }
  }, [layout, boundsOf])

  // ---- Größe beobachten ----
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // ---- Sanft zu einer Ansicht fahren ----
  const animateTo = useCallback((target: View, duration = 420) => {
    if (animation.current) cancelAnimationFrame(animation.current)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = viewRef.current
    if (reduce || duration === 0) {
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

  // ---- Zoomen um einen Punkt ----
  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_K, MAX_K)
      const f = k / v.k
      return { ...v, k, x: px - (px - v.x) * f, y: py - (py - v.y) * f }
    })
  }, [])

  // ---- 3D: Drehen um einen Punkt ----
  const rotateAt = useCallback((px: number, py: number, delta: number) => {
    setView((v) => rotateView(v, px, py, delta))
  }, [])

  /** Kompass: sanft zurück nach Norden, um die Bildschirmmitte */
  const resetRotation = () => {
    if (animation.current) cancelAnimationFrame(animation.current)
    const from = viewRef.current.r
    // Kürzester Weg zurück auf 0
    const total = -(((from % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI)
    const cx = size.width / 2
    const cy = size.height / 2
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return setView((v) => ({ ...rotateView(v, cx, cy, total), r: 0 }))
    const start = performance.now()
    let done = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 380)
      const e = 1 - Math.pow(1 - t, 3)
      const delta = total * e - done
      done = total * e
      setView((v) => ({ ...rotateView(v, cx, cy, delta), ...(t === 1 ? { r: 0 } : {}) }))
      animation.current = t < 1 ? requestAnimationFrame(step) : null
    }
    animation.current = requestAnimationFrame(step)
  }

  // Mausrad / Trackpad (braucht einen nicht-passiven Listener)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (animation.current) cancelAnimationFrame(animation.current)
      const rect = el.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      if (threeD && event.shiftKey) {
        // Umschalt + Mausrad dreht; manche Browser melden das als waagrechtes Scrollen
        rotateAt(px, py, (event.deltaY || event.deltaX) * 0.004)
        return
      }
      const speed = event.ctrlKey ? 0.01 : 0.0015 // Trackpad-Pinch meldet sich mit ctrlKey
      zoomAt(px, py, Math.exp(-event.deltaY * speed))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, rotateAt, threeD])

  // ---- Ziehen, Zwei-Finger-Zoom, Tippen ----
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ moved: number; target: Element | null; time: number; twist: number; rotating: boolean } | null>(null)
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)

  const local = (event: ReactPointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('.map-label, .map-compass')) return
    if (animation.current) cancelAnimationFrame(animation.current)
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, local(event))
    if (pointers.current.size === 1) {
      gesture.current = { moved: 0, target: event.target as Element, time: performance.now(), twist: 0, rotating: false }
    } else if (gesture.current) {
      gesture.current.moved = Infinity // zwei Finger → kein Tippen
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId)
    if (!previous) return
    const current = local(event)
    if (pointers.current.size === 1) {
      const dx = current.x - previous.x
      const dy = current.y - previous.y
      if (gesture.current) gesture.current.moved += Math.hypot(dx, dy)
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
    } else if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1]
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y)
        const after = Math.hypot(current.x - other.x, current.y - other.y)
        const mid = { x: (current.x + other.x) / 2, y: (current.y + other.y) / 2 }
        const midBefore = { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 }
        if (before > 0) zoomAt(mid.x, mid.y, after / before)
        setView((v) => ({ ...v, x: v.x + mid.x - midBefore.x, y: v.y + mid.y - midBefore.y }))
        // 3D: Finger drehen → Karte drehen (erst ab einer Mindestdrehung, dann direkt)
        const g = gesture.current
        if (threeD && g && before > 0) {
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
    if (g.moved > TAP_SLOP || performance.now() - g.time > 600) return

    // Doppeltippen → hineinzoomen
    const now = performance.now()
    const prev = lastTap.current
    if (prev && now - prev.time < 320 && Math.hypot(point.x - prev.x, point.y - prev.y) < 30) {
      lastTap.current = null
      const v = viewRef.current
      const k = clamp(v.k * 1.8, MIN_K, MAX_K)
      animateTo({ k, r: v.r, x: point.x - (point.x - v.x) * (k / v.k), y: point.y - (point.y - v.y) * (k / v.k) }, 260)
      return
    }
    lastTap.current = { time: now, x: point.x, y: point.y }

    const tileEl = g.target?.closest('[data-tile]')
    const courseId = g.target?.closest('[data-course]')?.getAttribute('data-course')
    if (courseId && tileEl && selectedId === courseId) onSelectTile(courseId, tileEl.getAttribute('data-tile')!)
    else if (courseId) onSelectCourse(courseId)
    else onBackground()
  }

  // Detailstufe nach Bildschirmgröße einer Zelle
  const cellPx = CELL * view.k
  const detail: 0 | 1 | 2 = cellPx < 24 ? 0 : cellPx < 64 ? 1 : 2

  return (
    <div
      ref={containerRef}
      className="worldmap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg className="worldmap-svg" width={size.width} height={size.height} aria-hidden="true">
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {threeD ? (
            <MapLayer3D layout={layout} courses={courses} learn={learn} heights={heights} detail={detail} selectedId={selectedId} rot={view.r} />
          ) : (
            <MapLayer layout={layout} courses={courses} learn={learn} detail={detail} selectedId={selectedId} />
          )}
        </g>
      </svg>

      {/* Kursnamen als echte Buttons (auch per Tastatur erreichbar) – oben auf der Umrandung */}
      {layout.map((course, i) => {
        const data = courses[i]
        const box = threeD ? boundsOf([i], view.r) : cellBounds(course.tiles)
        const x = (box.minX + box.maxX) / 2
        const y = box.minY - 8
        const dim = selectedId !== undefined && selectedId !== data.id
        return (
          <button
            key={data.id}
            type="button"
            className={dim ? 'map-label map-label--dim' : 'map-label'}
            style={{ left: x * view.k + view.x, top: y * view.k + view.y, '--course': courseColor(data) } as CSSProperties}
            onClick={() => onSelectCourse(data.id)}
          >
            {data.title}
          </button>
        )
      })}

      {/* 3D: Kompass zeigt nach Norden; Antippen dreht zurück */}
      {threeD && (
        <button
          type="button"
          className="round-btn round-btn--glass map-compass"
          aria-label="Karte nach Norden drehen"
          title="Nach Norden drehen"
          onClick={resetRotation}
        >
          <svg viewBox="-12 -12 24 24" width="26" height="26" aria-hidden="true" style={{ transform: `rotate(${view.r}rad)` }}>
            <path d="M0 -10 L4.5 0 H-4.5 Z" fill="currentColor" />
            <path d="M0 10 L4.5 0 H-4.5 Z" fill="currentColor" opacity="0.4" />
          </svg>
        </button>
      )}
    </div>
  )
}
