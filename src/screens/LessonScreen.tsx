import { IconButton, TopBar } from '../components/TopBar.tsx'
import { lessonStats } from '../lib/model.ts'
import type { Navigation } from '../lib/navigation.ts'
import { saveLessonResult } from '../lib/store.ts'
import type { Course, Lesson } from '../lib/types.ts'

// Platzhalter – der echte Lektionsablauf folgt in Phase 3.

export function LessonScreen({
  course,
  lesson,
  nav,
}: {
  course: Course
  lesson: Lesson
  nav: Navigation
}) {
  const simulateFinish = async () => {
    const { questions } = lessonStats(lesson)
    await saveLessonResult(course.id, lesson.id, {
      correct: Math.floor(Math.random() * (questions + 1)),
      total: questions,
      completedAt: Date.now(),
    })
    nav.back()
  }

  return (
    <>
      <TopBar left={<IconButton icon="close" label="Schließen" onClick={nav.back} />} />
      <main className="page">
        <p className="eyebrow">{course.title}</p>
        <h1 className="page-title">{lesson.title}</h1>

        <section className="card">
          <p>Der Lektionsablauf mit Leseabschnitten und Fragen kommt in Phase 3.</p>
        </section>

        <section className="card">
          <h2 className="card-title">Nur zum Testen</h2>
          <p className="muted small">
            Speichert ein zufälliges Ergebnis, als hättest du die Lektion abgeschlossen. So kannst du
            Häkchen und Fortschritt prüfen – auch nach dem Neuladen der Seite.
          </p>
          <button type="button" className="btn btn-secondary" onClick={simulateFinish}>
            Als erledigt speichern
          </button>
        </section>
      </main>
    </>
  )
}
