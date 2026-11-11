import { paragraphs } from '../../lib/model.ts'
import type { ReadingMode, TextStep } from '../../lib/types.ts'
import { isOnButton, useKeydown } from '../../lib/useKeydown.ts'
import { SegmentedControl } from '../SegmentedControl.tsx'
import { SpeedReader } from '../speed/SpeedReader.tsx'
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
  // Im Speed-Modus übernimmt der Speed-Reader die Tastatur
  useKeydown(
    (event) => {
      if (event.key === 'Enter' && !isOnButton(event)) {
        event.preventDefault()
        onNext()
      }
    },
    mode === 'normal',
  )

  const head = (
    <div className="step-head">
      <span className="eyebrow">
        Abschnitt {number} von {count}
      </span>
      <SegmentedControl label="Lesemodus" value={mode} options={MODES} onChange={onModeChange} />
    </div>
  )

  if (mode === 'speed') {
    return (
      <SpeedReader
        header={
          <>
            {head}
            {step.title && <h2 className="reading-title reading-title--compact">{step.title}</h2>}
          </>
        }
        text={step.text}
        onNext={onNext}
      />
    )
  }

  return (
    <>
      <div className="lesson-content step-enter">
        {head}
        <article className="reading-text">
          {step.title && <h2 className="reading-title">{step.title}</h2>}
          {paragraphs(step.text).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </article>
      </div>

      <LessonFooter>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Weiter
        </button>
      </LessonFooter>
    </>
  )
}
