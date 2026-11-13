import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
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
  recall: 'Karteikarte',
  order: 'Reihenfolge',
}

/** Wischweg (px), ab dem bei Entweder-oder eine Antwort gewählt ist */
const SWIPE = 50

/** Zufällige Reihenfolge, die nicht schon die richtige ist (sonst wäre die Aufgabe gelöst) */
function scrambled(count: number): number[] {
  for (let attempt = 0; attempt < 8; attempt++) {
    const order = shuffledIndices(count)
    if (order.some((value, i) => value !== i)) return order
  }
  return Array.from({ length: count }, (_, i) => (i + 1) % count)
}

export function QuestionCard({
  step,
  context,
  retry,
  exam = false,
  onAnswer,
  onNext,
}: {
  step: QuestionStep
  /** z. B. Kachel-Titel, unten auf der Karte */
  context: string
  retry: boolean
  /** Prüfung: keine Rückmeldung, nach der Antwort geht es sofort weiter */
  exam?: boolean
  onAnswer: (correct: boolean) => void
  onNext: () => void
}) {
  // Antworten einmal pro Anzeige mischen
  const [order] = useState(() =>
    step.type === 'order'
      ? scrambled(step.items.length)
      : step.type === 'truefalse' || step.type === 'recall'
        ? []
        : shuffledIndices(step.options.length),
  )
  const [result, setResult] = useState<Result | null>(null)
  /** Karteikarte: Antwort aufgedeckt */
  const [revealed, setRevealed] = useState(false)
  /** Reihenfolge: bisher gewählte Einträge (Nummern aus `items`) */
  const [picked, setPicked] = useState<number[]>([])
  const feedbackRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const swipeStart = useRef<number | null>(null)

  const finish = (next: Result) => {
    if (result) return
    setResult(next)
    onAnswer(next.correct)
    if (exam) onNext()
  }

  useEffect(() => {
    if (!result) return
    actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    nextRef.current?.focus({ preventScroll: true })
  }, [result])

  // ---- Fragen mit vorgegebenen Antworten ----
  const optionStep = step.type === 'recall' || step.type === 'order' ? null : step
  const choices = optionStep ? questionChoices(optionStep, order) : []
  const correct = optionStep ? correctValue(optionStep) : -1
  const decide = (selected: number | null) => finish({ selected, correct: selected !== null && selected === correct })

  // ---- Karteikarte ----
  const reveal = () => {
    if (!result) setRevealed(true)
  }

  // ---- Reihenfolge ----
  const orderDone = step.type === 'order' && picked.length === step.items.length
  const pick = (item: number) => {
    if (!result && !picked.includes(item)) setPicked([...picked, item])
  }
  const unpick = (item: number) => {
    if (!result) setPicked(picked.filter((p) => p !== item))
  }
  const checkOrder = () => finish({ selected: 1, correct: picked.every((item, position) => item === position) })

  const giveUp = () => {
    setRevealed(true)
    finish({ selected: null, correct: false })
  }

  useKeydown((event) => {
    if (result) {
      if (event.key === 'Enter' && !isOnButton(event)) {
        event.preventDefault()
        onNext()
      }
      return
    }
    if (step.type === 'recall') {
      if (!revealed && (event.key === 'Enter' || event.key === ' ') && !isOnButton(event)) {
        event.preventDefault()
        reveal()
      } else if (revealed && (event.key === '1' || event.key === '2')) {
        finish({ selected: 1, correct: event.key === '1' })
      }
    } else if (step.type === 'order') {
      if (/^[1-9]$/.test(event.key)) {
        const item = order.filter((i) => !picked.includes(i))[Number(event.key) - 1]
        if (item !== undefined) pick(item)
      } else if (event.key === 'Backspace' && picked.length > 0) {
        unpick(picked[picked.length - 1])
      } else if (event.key === 'Enter' && orderDone && !isOnButton(event)) {
        event.preventDefault()
        checkOrder()
      }
    } else if (step.type === 'binary' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault()
      decide(choices[event.key === 'ArrowUp' ? 0 : 1].value)
    } else if (/^[1-9]$/.test(event.key)) {
      const choice = choices[Number(event.key) - 1]
      if (choice) decide(choice.value)
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

  let body: ReactNode
  if (step.type === 'recall') {
    body = (
      <>
        <h2 className="q-title">{step.question}</h2>
        {!revealed ? (
          <>
            <p className="q-hint">Sag dir die Antwort erst selbst – am besten laut. Dann decke sie auf.</p>
            <button type="button" className="q-reveal" onClick={reveal}>
              Antwort zeigen
            </button>
          </>
        ) : (
          <>
            <div className="q-answer">
              <span className="q-answer-label">Antwort</span>
              <p>{step.answer}</p>
            </div>
            {!result && (
              <div className="q-options q-options--row">
                <button type="button" className="q-option" onClick={() => finish({ selected: 1, correct: true })}>
                  <span className="q-option-label">Gewusst</span>
                </button>
                <button type="button" className="q-option" onClick={() => finish({ selected: 1, correct: false })}>
                  <span className="q-option-label">Nicht gewusst</span>
                </button>
              </div>
            )}
          </>
        )}
      </>
    )
  } else if (step.type === 'order') {
    const rest = order.filter((item) => !picked.includes(item))
    body = (
      <>
        <h2 className="q-title">{step.question}</h2>
        <ol className="q-order" aria-label="Deine Reihenfolge">
          {step.items.map((_, position) => {
            const item = picked[position]
            const state = item === undefined ? 'empty' : !result ? 'idle' : item === position ? 'correct' : 'wrong'
            return (
              <li key={position}>
                <button
                  type="button"
                  className="q-order-slot"
                  data-state={state}
                  disabled={item === undefined || result !== null}
                  aria-label={item === undefined ? `Platz ${position + 1}, noch frei` : `${step.items[item]} – wieder entfernen`}
                  onClick={() => item !== undefined && unpick(item)}
                >
                  <span className="q-order-number">{position + 1}</span>
                  <span className="q-option-label">{item === undefined ? '' : step.items[item]}</span>
                  {state === 'correct' && <Icon name="check" size={20} />}
                  {state === 'wrong' && <Icon name="close" size={20} />}
                </button>
              </li>
            )
          })}
        </ol>
        {rest.length > 0 && !result && (
          <div className="q-options q-options--chips">
            {rest.map((item) => (
              <button key={item} type="button" className="q-option" onClick={() => pick(item)}>
                <span className="q-option-label">{step.items[item]}</span>
              </button>
            ))}
          </div>
        )}
        {!result && <p className="q-hint">Tippe die Einträge in der richtigen Reihenfolge an.</p>}
      </>
    )
  } else if (step.type === 'binary') {
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

  const feedbackTitle = !result
    ? ''
    : result.correct
      ? step.type === 'recall'
        ? 'Gewusst!'
        : 'Richtig!'
      : result.selected === null || step.type === 'recall'
        ? 'Kein Problem – jetzt weißt du es.'
        : 'Nicht ganz.'

  return (
    <>
      <div className="session-card session-card--color question-card step-enter" aria-label={questionText(step)}>
        {body}

        {result && !exam && (
          <div ref={feedbackRef} className="q-feedback" role="status">
            <p className="q-feedback-title">{feedbackTitle}</p>
            {!result.correct && step.type !== 'recall' && (
              <p className="q-feedback-solution">
                {step.type === 'truefalse'
                  ? correctLabel(step)
                  : step.type === 'order'
                    ? `Richtige Reihenfolge: ${correctLabel(step)}`
                    : `Richtig ist: „${correctLabel(step)}“`}
              </p>
            )}
            {step.explanation && <p>{step.explanation}</p>}
            {!result.correct && (
              <p className="q-feedback-again">
                <Icon name="shieldFilled" size={14} /> Diese Frage kommt am Ende noch einmal.
              </p>
            )}
          </div>
        )}

        <div ref={actionsRef} className="q-actions">
          <button
            type="button"
            className="q-btn q-btn--light"
            disabled={result !== null || (step.type === 'recall' && revealed)}
            onClick={giveUp}
          >
            Weiß ich nicht
          </button>
          {step.type === 'order' && !result ? (
            <button type="button" className="q-btn q-btn--next" disabled={!orderDone} onClick={checkOrder}>
              Prüfen
            </button>
          ) : (
            !exam && (
              <button ref={nextRef} type="button" className="q-btn q-btn--next" disabled={result === null} onClick={onNext}>
                Weiter
              </button>
            )
          )}
        </div>

        <footer className="q-footer">
          <span className="q-footer-kind">
            <Icon name={retry ? 'shieldFilled' : 'shield'} size={16} />
            {retry ? 'Noch einmal' : KIND_LABEL[step.type]}
          </span>
          <span className="q-footer-context">{context}</span>
        </footer>
      </div>
    </>
  )
}
