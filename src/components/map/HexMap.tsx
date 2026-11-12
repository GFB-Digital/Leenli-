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
import { bounds, hexPoints, layoutClusters, toPixel, type ClusterLayout } from '../../lib/hexmap.ts'
import { tileStatus } from '../../lib/model.ts'
import type { Course, LearnState } from '../../lib/types.ts'

/** Radius eines Feldes in Kartenpixeln (bei Zoom 1) */
const SIZE = 22
const MIN_K = 0.2
const MAX_K = 4
/** Beim Einpassen höchstens so weit hineinzoomen */
const FIT_MAX_K = 2.2
/** Bewegung (px), bis aus einem Tippen ein Ziehen wird */
const TAP_SLOP = 8

interface View {
  x: number
  y: number
  k: number
}

interface Insets {
  top: number
  bottom: number
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function fitView(box: ReturnType<typeof bounds>, width: number, height: number, insets: Insets): View {
  const pad = 24
  const availW = Math.max(80, width - 2 * pad)
  const availH = Math.max(80, height - insets.top - insets.bottom - 2 * pad)
  const k = clamp(Math.min(availW / box.width, availH / box.height), MIN_K, FIT_MAX_K)
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  return { k, x: width / 2 - cx * k, y: insets.top + pad + availH / 2 - cy * k }
}

/** Kachel-Titel kürzen, damit er ins Feld passt */
function shortTitle(title: string): string {
  return title.length > 16 ? `${title.slice(0, 15)}…` : title
}

// ---------------------------------------------------------------------------
// Ebene mit allen Feldern – neu gezeichnet nur, wenn sich Inhalt oder Detailstufe ändern

const HexLayer = memo(function HexLayer({
  layout,
  courses,
  learn,
  detail,
  selectedId,
}: {
  layout: ClusterLayout[]
  courses: Course[]
  learn: LearnState
  detail: 0 | 1 | 2
  selectedId?: string
}) {
  return (
    <g>
      {layout.map((cluster, i) => {
        const course = courses[i]
        const dim = selectedId !== undefined && selectedId !== course.id
        return (
          <g
            key={course.id}
            data-course={course.id}
            className={dim ? 'map-cluster map-cluster--dim' : 'map-cluster'}
            style={{ '--course': courseColor(course) } as CSSProperties}
          >
            {cluster.region.map((hex) => {
              const { x, y } = toPixel(hex, SIZE)
              return <polygon key={`${hex.q},${hex.r}`} className="map-region" points={hexPoints(x, y, SIZE)} />
            })}
            {cluster.tiles.map((hex, t) => {
              const tile = course.tiles[t]
              const status = tileStatus(learn, course.id, tile.id)
              const { x, y } = toPixel(hex, SIZE)
              return (
                <g key={tile.id} data-tile={tile.id} className={`map-tile map-tile--${status}`}>
                  <polygon points={hexPoints(x, y, SIZE * 0.86)} />
                  {detail >= 1 &&
                    (status === 'done' ? (
                      <path
                        className="map-tile-check"
                        d={`M${x - 6} ${y + (detail >= 2 ? -4 : 0)} l4.5 4.5 l8 -8.5`}
                      />
                    ) : (
                      <text
                        className="map-tile-emoji"
                        x={x}
                        y={y + (detail >= 2 ? -4 : 1)}
                        fontSize={detail >= 2 ? SIZE * 0.55 : SIZE * 0.7}
                      >
                        {tile.emoji ?? '•'}
                      </text>
                    ))}
                  {detail >= 2 && (
                    <text className="map-tile-title" x={x} y={y + SIZE * 0.42} fontSize={4.2}>
                      {shortTitle(tile.title)}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        )
      })}
    </g>
  )
})

// ---------------------------------------------------------------------------

export function HexMap({
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
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 })
  const viewRef = useRef(view)
  viewRef.current = view
  const animation = useRef<number | null>(null)

  const layout = useMemo(
    () => layoutClusters(courses.map((c) => ({ id: c.id, tileCount: c.tiles.length }))),
    [courses],
  )
  const allBounds = useMemo(() => bounds(layout.flatMap((c) => [...c.tiles, ...c.region]), SIZE), [layout])

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
    setView(fitView(allBounds, size.width, size.height, insets))
  }, [size, allBounds, insets])

  // Kurs gewählt → hinfahren, oberhalb des Kursblatts
  useEffect(() => {
    if (!selectedId || size.width === 0) return
    const cluster = layout.find((c) => c.id === selectedId)
    if (!cluster) return
    const box = bounds([...cluster.tiles, ...cluster.region], SIZE)
    const bottom = sheetOpen ? size.height * 0.6 : insets.bottom
    animateTo(fitView(box, size.width, size.height, { top: insets.top, bottom }))
  }, [selectedId, sheetOpen, layout, size, insets, animateTo])

  // ---- Zoomen um einen Punkt ----
  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_K, MAX_K)
      const f = k / v.k
      return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f }
    })
  }, [])

  // Mausrad / Trackpad (braucht einen nicht-passiven Listener)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (animation.current) cancelAnimationFrame(animation.current)
      const rect = el.getBoundingClientRect()
      const speed = event.ctrlKey ? 0.01 : 0.0015 // Trackpad-Pinch meldet sich mit ctrlKey
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, Math.exp(-event.deltaY * speed))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // ---- Ziehen, Zwei-Finger-Zoom, Tippen ----
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ moved: number; target: Element | null; time: number } | null>(null)
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null)

  const local = (event: ReactPointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('.map-label')) return
    if (animation.current) cancelAnimationFrame(animation.current)
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, local(event))
    if (pointers.current.size === 1) {
      gesture.current = { moved: 0, target: event.target as Element, time: performance.now() }
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
      const [other] = [...pointers.current.entries()].filter(([id]) => id !== event.pointerId)
      const o = other[1]
      const before = Math.hypot(previous.x - o.x, previous.y - o.y)
      const after = Math.hypot(current.x - o.x, current.y - o.y)
      const mid = { x: (current.x + o.x) / 2, y: (current.y + o.y) / 2 }
      const midBefore = { x: (previous.x + o.x) / 2, y: (previous.y + o.y) / 2 }
      if (before > 0) zoomAt(mid.x, mid.y, after / before)
      setView((v) => ({ ...v, x: v.x + mid.x - midBefore.x, y: v.y + mid.y - midBefore.y }))
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
      animateTo({ k: clamp(v.k * 1.8, MIN_K, MAX_K), x: point.x - (point.x - v.x) * (clamp(v.k * 1.8, MIN_K, MAX_K) / v.k), y: point.y - (point.y - v.y) * (clamp(v.k * 1.8, MIN_K, MAX_K) / v.k) }, 260)
      return
    }
    lastTap.current = { time: now, x: point.x, y: point.y }

    const tileEl = g.target?.closest('[data-tile]')
    const courseEl = g.target?.closest('[data-course]')
    const courseId = courseEl?.getAttribute('data-course')
    if (courseId && tileEl && selectedId === courseId) onSelectTile(courseId, tileEl.getAttribute('data-tile')!)
    else if (courseId) onSelectCourse(courseId)
    else onBackground()
  }

  const detail: 0 | 1 | 2 = view.k < 0.9 ? 0 : view.k < 1.9 ? 1 : 2

  return (
    <div
      ref={containerRef}
      className="hexmap"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg className="hexmap-svg" width={size.width} height={size.height} aria-hidden="true">
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <HexLayer layout={layout} courses={courses} learn={learn} detail={detail} selectedId={selectedId} />
        </g>
      </svg>

      {/* Kursnamen als echte Buttons (auch per Tastatur erreichbar) */}
      {layout.map((cluster, i) => {
        const course = courses[i]
        const top = Math.min(...cluster.tiles.map((hex) => toPixel(hex, SIZE).y)) - SIZE * 2.3
        const { x } = toPixel(cluster.center, SIZE)
        const dim = selectedId !== undefined && selectedId !== course.id
        return (
          <button
            key={course.id}
            type="button"
            className={dim ? 'map-label map-label--dim' : 'map-label'}
            style={
              {
                left: x * view.k + view.x,
                top: top * view.k + view.y,
                '--course': courseColor(course),
              } as CSSProperties
            }
            onClick={() => onSelectCourse(course.id)}
          >
            {course.emoji && <span aria-hidden="true">{course.emoji}</span>}
            {course.title}
          </button>
        )
      })}
    </div>
  )
}
