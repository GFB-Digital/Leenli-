import { useEffect, useMemo } from 'react'
import { UpdateBanner } from './components/UpdateBanner.tsx'
import { applyAppearance } from './lib/appearance.ts'
import { useNavigation, type Navigation } from './lib/navigation.ts'
import { usePwa } from './lib/pwa.ts'
import { useAppState } from './lib/store.ts'
import { ContentScreen } from './screens/ContentScreen.tsx'
import { KnowledgeScreen } from './screens/KnowledgeScreen.tsx'
import { MapScreen } from './screens/MapScreen.tsx'
import { SearchScreen } from './screens/SearchScreen.tsx'
import { ExamSession, ReviewSession, SessionScreen, SmartSession, type SessionSpec } from './screens/SessionScreen.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'

export default function App() {
  const app = useAppState()
  const nav = useNavigation()
  const pwa = usePwa()

  // Darstellung und Schriftgröße aus den Einstellungen anwenden
  const { theme, fontSize } = app.settings
  useEffect(() => {
    applyAppearance({ theme, fontSize })
  }, [theme, fontSize])

  // Gespeicherte Daten werden geladen (dauert nur einen Augenblick)
  if (!app.loaded) return <div className="app" aria-busy="true" />

  const { view } = nav
  let screen
  switch (view.name) {
    case 'course':
      screen = <MapScreen nav={nav} selectedCourseId={view.courseId} focusTileId={view.tileId} />
      break
    case 'tile':
      screen = (
        <TileSession
          key={`${view.courseId}/${view.tileId}/${view.mode}`}
          courseId={view.courseId}
          tileId={view.tileId}
          mode={view.mode}
          nav={nav}
        />
      )
      break
    case 'review':
      screen = (
        <ReviewSession
          key={`${view.courseId ?? 'alle'}/${view.round}/${view.hard ? 'schwer' : ''}`}
          courseId={view.courseId}
          round={view.round}
          hard={view.hard}
          nav={nav}
        />
      )
      break
    case 'exam': {
      const course = app.courses.find((c) => c.id === view.courseId)
      screen = course ? <ExamSession key={`${course.id}/${view.round}`} course={course} round={view.round} nav={nav} /> : <MapScreen nav={nav} />
      break
    }
    case 'search':
      screen = <SearchScreen nav={nav} />
      break
    case 'smart':
      screen = <SmartSession nav={nav} />
      break
    case 'knowledge':
      screen = <KnowledgeScreen nav={nav} section={view.section} />
      break
    case 'content':
      screen = <ContentScreen nav={nav} />
      break
    case 'settings':
      screen = <SettingsScreen nav={nav} />
      break
    default:
      screen = <MapScreen nav={nav} />
  }

  const inSession = view.name === 'tile' || view.name === 'review' || view.name === 'smart' || view.name === 'exam'
  return (
    <div className="app">
      {screen}
      {pwa.updateAvailable && !inSession && <UpdateBanner />}
    </div>
  )
}

/** Kachel lernen oder lesen – fällt auf die Karte zurück, falls es sie nicht (mehr) gibt */
function TileSession({
  courseId,
  tileId,
  mode,
  nav,
}: {
  courseId: string
  tileId: string
  mode: 'learn' | 'read'
  nav: Navigation
}) {
  const { courses } = useAppState()
  const course = courses.find((c) => c.id === courseId)
  const tile = course?.tiles.find((t) => t.id === tileId)
  const spec = useMemo<SessionSpec | null>(
    () => (course && tile ? { kind: 'tile', course, tile, mode } : null),
    [course, tile, mode],
  )
  if (!spec) return <MapScreen nav={nav} />
  return <SessionScreen spec={spec} nav={nav} />
}
