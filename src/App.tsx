import { UpdateBanner } from './components/UpdateBanner.tsx'
import { useNavigation } from './lib/navigation.ts'
import { usePwa } from './lib/pwa.ts'
import { useAppState } from './lib/store.ts'
import { ContentScreen } from './screens/ContentScreen.tsx'
import { CourseScreen } from './screens/CourseScreen.tsx'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { LessonScreen } from './screens/LessonScreen.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'

export default function App() {
  const app = useAppState()
  const nav = useNavigation()
  const pwa = usePwa()

  // Gespeicherte Daten werden geladen (dauert nur einen Augenblick)
  if (!app.loaded) return <div className="app" aria-busy="true" />

  const { view } = nav
  const course =
    view.name === 'course' || view.name === 'lesson'
      ? app.courses.find((c) => c.id === view.courseId)
      : undefined
  const lesson =
    view.name === 'lesson' ? course?.lessons.find((l) => l.id === view.lessonId) : undefined

  let screen
  if (view.name === 'lesson' && course && lesson) {
    screen = <LessonScreen key={lesson.id} course={course} lesson={lesson} nav={nav} />
  } else if ((view.name === 'course' || view.name === 'lesson') && course) {
    screen = <CourseScreen course={course} nav={nav} />
  } else if (view.name === 'content') {
    screen = <ContentScreen nav={nav} />
  } else if (view.name === 'settings') {
    screen = <SettingsScreen nav={nav} />
  } else {
    // Startseite – auch als Rückfall, falls ein Kurs inzwischen gelöscht wurde
    screen = <HomeScreen nav={nav} />
  }

  return (
    <div className="app">
      {screen}
      {pwa.updateAvailable && view.name !== 'lesson' && <UpdateBanner />}
    </div>
  )
}
