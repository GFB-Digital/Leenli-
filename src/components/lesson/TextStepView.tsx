import { paragraphs } from '../../lib/model.ts'
import type { ReadingMode, TextStep } from '../../lib/types.ts'
import { isOnButton, useKeydown } from '../../lib/useKeydown.ts'
import { SegmentedControl } from '../SegmentedControl.tsx'
import { LessonFooter } from './LessonFooter.tsx'

const MODES: { value: ReadingMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'speed', label: 'Speed' },
]

export function TextStepView({
  step,
  number,
  count,
  mode,
  onModeChange,
  onNext,
}: {
  step: TextStep
  /** Nummer dieses Abschnitts (ab 1) */
  number: number
  /** Anzahl Abschnitte in der Lektion */
  count: number
  mode: ReadingMode
  onModeChange: (mode: ReadingMode) => void
  onNext: () => void
}) {
  useKeydown((event) => {
    if (event.key === 'Enter' && !isOnButton(event)) {
      event.preventDefault()
      onNext()
    }
  })

  return (
    <>
      <div className="lesson-content step-enter">
        <div className="step-head">
          <span className="eyebrow">
            Abschnitt {number} von {count}
          </span>
          <SegmentedControl label="Lesemodus" value={mode} options={MODES} onChange={onModeChange} />
        </div>

        {mode === 'normal' ? (
          <article className="reading-text">
            {step.title && <h2 className="reading-title">{step.title}</h2>}
            {paragraphs(step.text).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </article>
        ) : (
          // Platzhalter – der Speed-Reader folgt in Phase 4
          <div className="card">
            {step.title && <h2 className="reading-title">{step.title}</h2>}
            <p className="muted">
              Der Speed-Reader kommt in Phase 4. Bis dahin kannst du oben auf „Normal“ umschalten.
            </p>
          </div>
        )}
      </div>

      <LessonFooter>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Weiter
        </button>
      </LessonFooter>
    </>
  )
}
