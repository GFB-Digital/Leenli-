import { useMemo } from 'react'
import { Icon } from '../components/Icon.tsx'
import { CourseSheet } from '../components/map/CourseSheet.tsx'
import { WorldMap } from '../components/map/WorldMap.tsx'
import type { Navigation } from '../lib/navigation.ts'
import { dueCards } from '../lib/smart.ts'
import { useAppState } from '../lib/store.ts'
import { dayKey, hasStamp, totalStamps } from '../lib/streak.ts'

/** Startseite: Wissenskarte mit allen Kursen */
export function MapScreen({
  nav,
  selectedCourseId,
  focusTileId,
}: {
  nav: Navigation
  selectedCourseId?: string
  focusTileId?: string
}) {
  const { courses, learn, storage } = useAppState()
  const selected = courses.find((c) => c.id === selectedCourseId)
  const due = dueCards(courses, learn, Date.now()).length
  const stamps = totalStamps(learn.days)
  const stampedToday = hasStamp(learn.days[dayKey()])

  // Bereiche, die Kopf- und Fußleiste verdecken (fest → Karte springt nicht)
  const insets = useMemo(() => ({ top: 120, bottom: 130 }), [])

  const openCourse = (courseId: string, tileId?: string) => {
    if (selectedCourseId) nav.replace({ name: 'course', courseId, tileId })
    else nav.navigate({ name: 'course', courseId, tileId })
  }

  return (
    <div className="map-screen">
      <WorldMap
        courses={courses}
        learn={learn}
        selectedId={selected?.id}
        insets={insets}
        sheetOpen={selected !== undefined}
        onSelectCourse={(id) => openCourse(id)}
        onSelectTile={(courseId, tileId) => openCourse(courseId, tileId)}
        onBackground={() => selected && nav.back()}
      />

      <header className="map-header">
        <div className="map-brand">
          <span className="map-logo">ΤΟΠΟΣ</span>
          <span className="map-tagline">Dein Ort des Wissens</span>
        </div>
        <div className="map-actions">
          <button type="button" className="round-btn round-btn--glass" aria-label="Suche" title="Suche" onClick={() => nav.navigate({ name: 'search' })}>
            <Icon name="search" />
          </button>
          <button type="button" className="round-btn round-btn--glass" aria-label="Inhalte" title="Inhalte" onClick={() => nav.navigate({ name: 'content' })}>
            <Icon name="import" />
          </button>
          <button type="button" className="round-btn round-btn--glass" aria-label="Einstellungen" title="Einstellungen" onClick={() => nav.navigate({ name: 'settings' })}>
            <Icon name="settings" />
          </button>
        </div>
      </header>

      {storage === 'memory' && (
        <p className="notice map-notice" role="alert">
          Dieser Browser erlaubt gerade kein dauerhaftes Speichern. Dein Fortschritt geht beim Schließen verloren.
        </p>
      )}

      {!selected && (
        <nav className="map-bottom" aria-label="Lernen">
          <button type="button" className="map-side" onClick={() => nav.navigate({ name: 'knowledge' })}>
            <span className="round-btn round-btn--accent">
              <Icon name="knowledge" size={26} />
            </span>
            <span className="map-side-label">Wissensbank</span>
          </button>

          <button type="button" className="smart-btn" onClick={() => nav.navigate({ name: 'smart' })}>
            <Icon name="bolt" size={22} />
            Schlau lernen
            {due > 0 && <span className="smart-badge" aria-label={`${due} Fragen fällig`}>{due}</span>}
          </button>

          <button type="button" className="map-side" onClick={() => nav.navigate({ name: 'knowledge', section: 'days' })}>
            <span className="round-btn round-btn--accent">
              <Icon name="calendar" size={26} />
              <span className={stampedToday ? 'side-badge side-badge--done' : 'side-badge'} aria-label={`${stamps} Lerntage`}>
                {stamps}
              </span>
            </span>
            <span className="map-side-label">Lerntage</span>
          </button>
        </nav>
      )}

      {selected && (
        <CourseSheet course={selected} focusTileId={focusTileId} nav={nav} onClose={() => nav.back()} />
      )}
    </div>
  )
}
