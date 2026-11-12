import { useState } from 'react'
import { inlineSegments, paragraphs } from '../../lib/model.ts'
import type { ImageRef, ReadingMode, TextStep } from '../../lib/types.ts'
import { isOnButton, useKeydown } from '../../lib/useKeydown.ts'
import { LessonFooter } from '../lesson/LessonFooter.tsx'
import { SegmentedControl } from '../SegmentedControl.tsx'
import { SpeedReader } from '../speed/SpeedReader.tsx'

const MODES: { value: ReadingMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'speed', label: 'Speed' },
]

function RichText({ text }: { text: string }) {
  return (
    <>
      {inlineSegments(text).map((segment, i) =>
        segment.bold ? <strong key={i}>{segment.text}</strong> : <span key={i}>{segment.text}</span>,
      )}
    </>
  )
}

/** Bild mit Quellenangabe; fehlt es (falscher Link, offline), erscheint ein Hinweis */
function Figure({ image }: { image: ImageRef }) {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  return (
    <figure className="page-figure">
      {failed ? (
        <button type="button" className="page-image-missing" onClick={() => { setFailed(false); setAttempt(attempt + 1) }}>
          Bild konnte nicht geladen werden – antippen für neuen Versuch
        </button>
      ) : (
        <img
          key={attempt}
          className="page-image"
          src={image.src}
          alt={image.alt ?? ''}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
      {image.credit && <figcaption>{image.credit}</figcaption>}
    </figure>
  )
}

export function PageView({
  step,
  courseTitle,
  tileTitle,
  page,
  pages,
  mode,
  onModeChange,
  onNext,
}: {
  step: TextStep
  courseTitle: string
  tileTitle: string
  page: number
  pages: number
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
    <header className="page-head">
      <span className="page-course">{courseTitle}</span>
      <span className="page-tile">{tileTitle}</span>
      <span className="page-count">
        Seite {page} / {pages}
      </span>
      <SegmentedControl label="Lesemodus" value={mode} options={MODES} onChange={onModeChange} />
    </header>
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

  const parts = paragraphs(step.text)
  return (
    <>
      <div className="lesson-content step-enter">
        <div className="session-card page-card">
          {head}
          <article className="reading-text">
            {step.title && <h2 className="reading-title">{step.title}</h2>}
            {parts.map((paragraph, i) => (
              <div key={i}>
                <p>
                  <RichText text={paragraph} />
                </p>
                {/* Bild nach dem ersten Absatz */}
                {i === 0 && step.image && <Figure image={step.image} />}
              </div>
            ))}
          </article>
        </div>
      </div>
      <LessonFooter>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Weiter
        </button>
      </LessonFooter>
    </>
  )
}
