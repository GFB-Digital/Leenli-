import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { LessonSummary } from '../components/lesson/LessonSummary.tsx'
import { QuestionStepView, type Answer } from '../components/lesson/QuestionStepView.tsx'
import { TextStepView } from '../components/lesson/TextStepView.tsx'
import { ProgressBar } from '../components/ProgressBar.tsx'
import { IconButton } from '../components/TopBar.tsx'
import { shuffledIndices } from '../lib/model.ts'
import type { Navigation } from '../lib/navigation.ts'
import { saveLessonResult, useAppState } from '../lib/store.ts'
import { isQuestion, type Course, type Lesson, type ReadingMode } from '../lib/types.ts'

export function LessonScreen({
  course,
  lesson,
  nav,
}: {
  course: Course
  lesson: Lesson
  nav: Navigation
}) {
  const { settings } = useAppState()
  const steps = lesson.steps

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [finished, setFinished] = useState(steps.length === 0)
  // Gewählter Lesemodus gilt für alle weiteren Abschnitte dieser Lektion
  const [mode, setMode] = useState<ReadingMode>(settings.readingMode)
  const [confirmClose, setConfirmClose] = useState(false)
  // Antwortoptionen einmal pro Durchgang mischen
  const [orders] = useState(() =>
    steps.map((step) => (step.type === 'choice' ? shuffledIndices(step.options.length) : [])),
  )

  const mainRef = useRef<HTMLElement>(null)

  // Neuer Schritt: nach oben scrollen, Fokus für Screenreader an den Anfang
  useEffect(() => {
    window.scrollTo(0, 0)
    mainRef.current?.focus({ preventScroll: true })
  }, [index, finished])

  const questionIndices = steps.flatMap((step, i) => (isQuestion(step) ? [i] : []))
  const textIndices = steps.flatMap((step, i) => (step.type === 'text' ? [i] : []))
  const results = questionIndices.map((i) => answers[i]?.correct === true)

  const finish = () => {
    void saveLessonResult(course.id, lesson.id, {
      correct: results.filter(Boolean).length,
      total: results.length,
      completedAt: Date.now(),
    })
    setFinished(true)
  }

  const goNext = () => {
    if (index < steps.length - 1) setIndex(index + 1)
    else finish()
  }

  const requestClose = () => {
    const started = index > 0 || Object.keys(answers).length > 0
    if (started && !finished) setConfirmClose(true)
    else nav.back()
  }

  const step = steps[index]
  let content
  if (finished || !step) {
    content = <LessonSummary lessonTitle={lesson.title} results={results} onDone={nav.back} />
  } else if (step.type === 'text') {
    content = (
      <TextStepView
        key={index}
        step={step}
        number={textIndices.indexOf(index) + 1}
        count={textIndices.length}
        mode={mode}
        onModeChange={setMode}
        onNext={goNext}
      />
    )
  } else {
    content = (
      <QuestionStepView
        key={index}
        step={step}
        order={orders[index]}
        number={questionIndices.indexOf(index) + 1}
        count={questionIndices.length}
        answer={answers[index]}
        onAnswer={(answer) => setAnswers((prev) => ({ ...prev, [index]: answer }))}
        onNext={goNext}
      />
    )
  }

  return (
    <div className="lesson">
      <header className="topbar lesson-topbar">
        <div className="topbar-inner">
          <IconButton icon="close" label="Lektion schließen" onClick={requestClose} />
          <ProgressBar
            value={finished ? steps.length : index}
            max={steps.length}
            label="Fortschritt in der Lektion"
          />
        </div>
      </header>

      <main ref={mainRef} className="lesson-main" tabIndex={-1} aria-label={lesson.title}>
        {content}
      </main>

      <ConfirmDialog
        open={confirmClose}
        title="Lektion beenden?"
        message="Dein Fortschritt in dieser Lektion wird nicht gespeichert."
        confirmLabel="Beenden"
        cancelLabel="Weiterlernen"
        onConfirm={() => {
          setConfirmClose(false)
          nav.back()
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  )
}
