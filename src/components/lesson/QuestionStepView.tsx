import { useEffect, useRef } from 'react'
import { correctValue, questionChoices } from '../../lib/model.ts'
import type { QuestionStep } from '../../lib/types.ts'
import { isOnButton, useKeydown } from '../../lib/useKeydown.ts'
import { Icon } from '../Icon.tsx'
import { LessonFooter } from './LessonFooter.tsx'

export interface Answer {
  /** gewählter Wert (siehe Choice.value) */
  selected: number
  correct: boolean
}

export function QuestionStepView({
  step,
  order,
  number,
  count,
  answer,
  onAnswer,
  onNext,
}: {
  step: QuestionStep
  /** gemischte Reihenfolge der Optionen */
  order: number[]
  number: number
  count: number
  answer: Answer | undefined
  onAnswer: (answer: Answer) => void
  onNext: () => void
}) {
  const choices = questionChoices(step, order)
  const correct = correctValue(step)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const choose = (value: number) => {
    if (answer) return
    onAnswer({ selected: value, correct: value === correct })
  }

  // Nach der Antwort: Rückmeldung ins Bild holen, „Weiter“ für die Tastatur fokussieren
  useEffect(() => {
    if (!answer) return
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    nextRef.current?.focus({ preventScroll: true })
  }, [answer])

  // PC: Ziffern 1–9 wählen eine Antwort, Enter geht weiter
  useKeydown((event) => {
    if (!answer && /^[1-9]$/.test(event.key)) {
      const choice = choices[Number(event.key) - 1]
      if (choice) choose(choice.value)
    } else if (answer && event.key === 'Enter' && !isOnButton(event)) {
      event.preventDefault()
      onNext()
    }
  })

  const isTrueFalse = step.type === 'truefalse'
  const correctLabel = choices.find((c) => c.value === correct)?.label ?? ''

  return (
    <>
      <div className="lesson-content step-enter">
        <div className="step-head">
          <span className="eyebrow">
            {isTrueFalse ? 'Stimmt das?' : 'Frage'} · {number} von {count}
          </span>
        </div>

        <h2 className="question-text">{isTrueFalse ? step.statement : step.question}</h2>

        <div
          className={isTrueFalse ? 'options options--row' : 'options'}
          role="group"
          aria-label="Antworten"
        >
          {choices.map((choice) => {
            const state = !answer
              ? 'idle'
              : choice.value === correct
                ? 'correct'
                : choice.value === answer.selected
                  ? 'wrong'
                  : 'dimmed'
            return (
              <button
                key={choice.value}
                type="button"
                className="option"
                data-state={state}
                disabled={answer !== undefined}
                onClick={() => choose(choice.value)}
              >
                <span className="option-label">{choice.label}</span>
                {state === 'correct' && <Icon name="check" size={20} />}
                {state === 'wrong' && <Icon name="close" size={20} />}
              </button>
            )
          })}
        </div>

        {answer && (
          <div
            ref={feedbackRef}
            className={answer.correct ? 'feedback feedback--correct' : 'feedback feedback--wrong'}
            role="status"
          >
            <p className="feedback-title">{answer.correct ? 'Richtig!' : 'Nicht ganz.'}</p>
            {!answer.correct && (
              <p className="feedback-solution">
                {isTrueFalse
                  ? correct === 1
                    ? 'Die Aussage stimmt.'
                    : 'Die Aussage stimmt nicht.'
                  : `Richtig ist: „${correctLabel}“`}
              </p>
            )}
            {step.explanation && <p className="feedback-text">{step.explanation}</p>}
          </div>
        )}
      </div>

      {answer && (
        <LessonFooter>
          <button ref={nextRef} type="button" className="btn btn-primary" onClick={onNext}>
            Weiter
          </button>
        </LessonFooter>
      )}
    </>
  )
}
