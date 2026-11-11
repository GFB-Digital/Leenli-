import { CourseBadge } from '../components/CourseBadge.tsx'
import { Icon } from '../components/Icon.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { IconButton, TopBar } from '../components/TopBar.tsx'
import { courseStats, lessonResult, lessonStats, nextLesson, plural } from '../lib/model.ts'
import type { Navigation } from '../lib/navigation.ts'
import { useAppState } from '../lib/store.ts'
import type { Course, Lesson, LessonResult } from '../lib/types.ts'

export function CourseScreen({ course, nav }: { course: Course; nav: Navigation }) {
  const { progress } = useAppState()
  const { done, total } = courseStats(course, progress)
  const next = nextLesson(course, progress)

  const openLesson = (lesson: Lesson) =>
    nav.navigate({ name: 'lesson', courseId: course.id, lessonId: lesson.id })

  return (
    <>
      <TopBar left={<IconButton icon="back" label="Kurse" onClick={nav.back} showLabel />} />

      <main className="page">
        <header className="course-header">
          <CourseBadge course={course} large />
          <h1 className="page-title">{course.title}</h1>
          {course.description && <p className="lead">{course.description}</p>}

          <div className="course-progress">
            <ProgressBar value={done} max={total} label="Fortschritt im Kurs" />
            <span className="course-progress-text">
              {done} von {total} {total === 1 ? 'Lektion' : 'Lektionen'}
            </span>
          </div>

          {next ? (
            <button type="button" className="btn btn-primary btn-block" onClick={() => openLesson(next)}>
              {done === 0 ? 'Kurs starten' : 'Weiter lernen'}
            </button>
          ) : (
            <p className="muted">Alles erledigt! Du kannst jede Lektion jederzeit wiederholen.</p>
          )}
        </header>

        <h2 className="section-label">Lektionen</h2>
        <ol className="lesson-list">
          {course.lessons.map((lesson, index) => {
            const result = lessonResult(progress, course.id, lesson.id)
            const state = result ? 'done' : lesson === next ? 'next' : 'open'
            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  className="lesson-row"
                  data-state={state}
                  onClick={() => openLesson(lesson)}
                >
                  <span className="lesson-marker" aria-hidden="true">
                    {result ? <Icon name="check" size={18} /> : index + 1}
                  </span>
                  <span className="lesson-body">
                    <span className="lesson-title">{lesson.title}</span>
                    <span className="lesson-meta">
                      {result ? (
                        <>
                          <span className="visually-hidden">Erledigt: </span>
                          {resultText(result)}
                        </>
                      ) : (
                        lessonMeta(lesson)
                      )}
                    </span>
                  </span>
                  <Icon name="chevron" size={20} />
                </button>
              </li>
            )
          })}
        </ol>
      </main>
    </>
  )
}

function lessonMeta(lesson: Lesson): string {
  const { sections, questions } = lessonStats(lesson)
  const parts = [plural(sections, 'Abschnitt', 'Abschnitte')]
  if (questions > 0) parts.push(plural(questions, 'Frage', 'Fragen'))
  return parts.join(' · ')
}

function resultText(result: LessonResult): string {
  if (result.total === 0) return 'Gelesen'
  return `${result.correct} von ${result.total} richtig`
}
