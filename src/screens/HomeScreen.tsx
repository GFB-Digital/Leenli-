import { CourseBadge } from '../components/CourseBadge.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { IconButton, TopBar } from '../components/TopBar.tsx'
import { courseStats } from '../lib/model.ts'
import type { Navigation } from '../lib/navigation.ts'
import { useAppState } from '../lib/store.ts'
import type { Course, Progress } from '../lib/types.ts'

export function HomeScreen({ nav }: { nav: Navigation }) {
  const { courses, progress, storage, importedCourses } = useAppState()

  return (
    <>
      <TopBar
        left={<span className="brand">Leenli</span>}
        right={
          <>
            <IconButton icon="import" label="Inhalte" onClick={() => nav.navigate({ name: 'content' })} />
            <IconButton
              icon="settings"
              label="Einstellungen"
              onClick={() => nav.navigate({ name: 'settings' })}
            />
          </>
        }
      />

      <main className="page">
        {storage === 'memory' && (
          <p className="notice" role="alert">
            Dieser Browser erlaubt gerade kein dauerhaftes Speichern (z. B. im privaten Fenster).
            Dein Fortschritt geht beim Schließen verloren.
          </p>
        )}

        <h1 className="page-title">Deine Kurse</h1>

        <ul className="course-list">
          {courses.map((course) => (
            <li key={course.id}>
              <CourseCard
                course={course}
                progress={progress}
                onOpen={() => nav.navigate({ name: 'course', courseId: course.id })}
              />
            </li>
          ))}
        </ul>

        {importedCourses.length === 0 && (
          <button type="button" className="add-card" onClick={() => nav.navigate({ name: 'content' })}>
            <span className="add-card-title">Eigene Kurse hinzufügen</span>
            <span className="add-card-text">
              Lass dir von Claude einen Kurs als JSON erstellen und importiere ihn unter „Inhalte“.
            </span>
          </button>
        )}
      </main>
    </>
  )
}

function CourseCard({
  course,
  progress,
  onOpen,
}: {
  course: Course
  progress: Progress
  onOpen: () => void
}) {
  const { done, total } = courseStats(course, progress)
  return (
    <button type="button" className="course-card" onClick={onOpen}>
      <CourseBadge course={course} />
      <span className="course-card-body">
        <span className="course-card-title">{course.title}</span>
        {course.description && <span className="course-card-desc">{course.description}</span>}
        <span className="course-card-meta">
          <ProgressBar value={done} max={total} label="Fortschritt" />
          <span className="course-card-count">
            {done}/{total} Lektionen
          </span>
        </span>
      </span>
    </button>
  )
}
