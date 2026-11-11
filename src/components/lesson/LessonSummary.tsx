import { isOnButton, useKeydown } from '../../lib/useKeydown.ts'
import { Icon } from '../Icon.tsx'
import { LessonFooter } from './LessonFooter.tsx'

function message(correct: number, total: number): { title: string; text: string } {
  if (total === 0) return { title: 'Geschafft!', text: 'Du hast die Lektion durchgelesen.' }
  if (correct === total) return { title: 'Perfekt!', text: 'Alle Fragen richtig beantwortet.' }
  if (correct / total >= 0.5)
    return {
      title: 'Gut gemacht!',
      text: 'Wiederhole die Lektion in ein paar Tagen – dann sitzt das Wissen noch besser.',
    }
  return {
    title: 'Dranbleiben!',
    text: 'Fehler gehören zum Lernen dazu. Wiederhole die Lektion bald noch einmal.',
  }
}

export function LessonSummary({
  lessonTitle,
  results,
  onDone,
}: {
  lessonTitle: string
  /** pro Frage: richtig beantwortet? */
  results: boolean[]
  onDone: () => void
}) {
  const correct = results.filter(Boolean).length
  const total = results.length
  const { title, text } = message(correct, total)

  useKeydown((event) => {
    if (event.key === 'Enter' && !isOnButton(event)) {
      event.preventDefault()
      onDone()
    }
  })

  return (
    <>
      <div className="lesson-content summary step-enter">
        <p className="eyebrow">{lessonTitle}</p>
        <h2 className="summary-title">{title}</h2>

        {total > 0 && (
          <>
            <p className="summary-score">
              <span className="summary-number">{correct}</span> von {total} richtig
            </p>
            <ol className="summary-dots" aria-label="Deine Antworten">
              {results.map((ok, i) => (
                <li
                  key={i}
                  className={ok ? 'summary-dot summary-dot--correct' : 'summary-dot summary-dot--wrong'}
                  aria-label={`Frage ${i + 1}: ${ok ? 'richtig' : 'falsch'}`}
                >
                  <Icon name={ok ? 'check' : 'close'} size={16} />
                </li>
              ))}
            </ol>
          </>
        )}

        <p className="summary-text">{text}</p>
      </div>

      <LessonFooter>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Zurück zum Kurs
        </button>
      </LessonFooter>
    </>
  )
}
