import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { CLOZE_GAP } from '../../lib/importer.ts'
import {
  correctLabel,
  correctValue,
  questionChoices,
  questionText,
  shuffledIndices,
  type Choice,
} from '../../lib/model.ts'
import type { QuestionStep } from '../../lib/types.ts'
import { isOnButton, useKeydown } from '../../lib/useKeydown.ts'
import { Icon } from '../Icon.tsx'

interface Result {
  correct: boolean
  /** gewählte Antwort; null = „Weiß ich nicht“ */
  selected: number | null
}

const KIND_LABEL: Record<QuestionStep['type'], string> = {
  choice: 'Frage',
  binary: 'Entweder – oder',
  truefalse: 'Stimmt das?',
  cloze: 'Lückentext',
}

/** Wischweg (px), ab dem bei Entweder-oder eine Antwort gewählt ist */
const SWIPE = 50

export function QuestionCard({
  step,
  context,
  retry,
  onAnswer,
  onNext,
}: {
  step: QuestionStep
  /** z. B. Kachel-Titel, unten auf der Karte */
  context: string
  retry: boolean
  onAnswer: (correct: boolean) => void
  onNext: () => void
}) {
  // Antworten einmal pro Anzeige mischen
  const [order] = useState(() => (step.type === 'truefalse' ? [] : shuffledIndices(step.options.length)))
  const [result, setResult] = useState<Result | null>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const swipeStart = useRef<number | null>(null)

  const choices = questionChoices(step, order)
  const correct = correctValue(step)

  const decide = (selected: number | null) => {
    if (result) return
    const next = { selected, correct: selected === correct }
    setResult(next)
    onAnswer(next.correct)
  }

  useEffect(() => {
    if (!result) return
    actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    nextRef.current?.focus({ preventScroll: true })
  }, [result])

  useKeydown((event) => {
    if (!result) {
      if (step.type === 'binary' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault()
        decide(choices[event.key === 'ArrowUp' ? 0 : 1].value)
      } else if (/^[1-9]$/.test(event.key)) {
        const choice = choices[Number(event.key) - 1]
        if (choice) decide(choice.value)
      }
    } else if (event.key === 'Enter' && !isOnButton(event)) {
      event.preventDefault()
      onNext()
    }
  })

  const stateOf = (choice: Choice) =>
    !result
      ? 'idle'
      : choice.value === correct
        ? 'correct'
        : choice.value === result.selected
          ? 'wrong'
          : 'dimmed'

  const option = (choice: Choice, extra = '') => {
    const state = stateOf(choice)
    return (
      <button
        key={choice.value}
        type="button"
        className={`q-option ${extra}`}
        data-state={state}
        disabled={result !== null}
        onClick={() => decide(choice.value)}
      >
        <span className="q-option-label">{choice.label}</span>
        {state === 'correct' && <Icon name="check" size={20} />}
        {state === 'wrong' && <Icon name="close" size={20} />}
      </button>
    )
  }

  // Entweder-oder: nach oben bzw. unten wischen
  const onPointerDown = (event: PointerEvent) => {
    if (step.type === 'binary' && !result) swipeStart.current = event.clientY
  }
  const onPointerUp = (event: PointerEvent) => {
    if (swipeStart.current === null) return
    const dy = event.clientY - swipeStart.current
    swipeStart.current = null
    if (Math.abs(dy) >= SWIPE) decide(choices[dy < 0 ? 0 : 1].value)
  }

  let body
  if (step.type === 'binary') {
    body = (
      <div className="q-binary" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {option(choices[0], 'q-option--wide')}
        <Icon name="arrowUp" size={28} />
        <h2 className="q-title">{step.question}</h2>
        <Icon name="arrowDown" size={28} />
        {option(choices[1], 'q-option--wide')}
      </div>
    )
  } else if (step.type === 'cloze') {
    const [before, after] = step.text.split(CLOZE_GAP)
    const filled = result ? step.options[step.answer] : null
    body = (
      <>
        <h2 className="q-title q-cloze">
          {before}
          <span className={filled ? 'q-gap q-gap--filled' : 'q-gap'}>{filled ?? '\u2003\u2003\u2003'}</span>
          {after}
        </h2>
        <div className="q-options q-options--chips">{choices.map((choice) => option(choice))}</div>
      </>
    )
  } else if (step.type === 'truefalse') {
    body = (
      <>
        <h2 className="q-title">{step.statement}</h2>
        <div className="q-options q-options--row">{choices.map((choice) => option(choice))}</div>
      </>
    )
  } else {
    body = (
      <>
        <h2 className="q-title">{step.question}</h2>
        <div className="q-options">{choices.map((choice) => option(choice))}</div>
      </>
    )
  }

  return (
    <>
      <div className="session-card session-card--color question-card step-enter" aria-label={questionText(step)}>
        {body}

        {result && (
          <div ref={feedbackRef} className="q-feedback" role="status">
            <p className="q-feedback-title">
              {result.correct ? 'Richtig!' : result.selected === null ? 'Kein Problem – jetzt weißt du es.' : 'Nicht ganz.'}
            </p>
            {!result.correct && (
              <p className="q-feedback-solution">
                {step.type === 'truefalse' ? correctLabel(step) : `Richtig ist: „${correctLabel(step)}“`}
              </p>
            )}
            {step.explanation && <p>{step.explanation}</p>}
            {!result.correct && (
              <p className="q-feedback-again">
                <Icon name="octFilled" size={14} /> Diese Frage kommt am Ende noch einmal.
              </p>
            )}
          </div>
        )}

        <div ref={actionsRef} className="q-actions">
          <button type="button" className="q-btn q-btn--light" disabled={result !== null} onClick={() => decide(null)}>
            Weiß ich nicht
          </button>
          <button ref={nextRef} type="button" className="q-btn q-btn--next" disabled={result === null} onClick={onNext}>
            Weiter
          </button>
        </div>

        <footer className="q-footer">
          <span className="q-footer-kind">
            <Icon name={retry ? 'octFilled' : 'oct'} size={16} />
            {retry ? 'Noch einmal' : KIND_LABEL[step.type]}
          </span>
          <span className="q-footer-context">{context}</span>
        </footer>
      </div>
    </>
  )
}
