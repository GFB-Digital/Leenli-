import { useState } from 'react'
import { isOnButton, useKeydown } from '../../lib/useKeydown.ts'
import { LessonFooter } from '../lesson/LessonFooter.tsx'

/**
 * Karte mit Einträgen zum Aufdecken – für „Du lernst …“ (Leitfragen) und
 * „Rückblick“ (Kernaussagen). Aufgedeckt wird der Reihe nach.
 */
export function RevealCard({
  eyebrow,
  title,
  heading,
  entries,
  onNext,
}: {
  eyebrow: string
  title: string
  heading: string
  entries: string[]
  onNext: () => void
}) {
  const [revealed, setRevealed] = useState(0)
  const allOpen = revealed >= entries.length

  useKeydown((event) => {
    if (event.key !== 'Enter' || isOnButton(event)) return
    event.preventDefault()
    if (allOpen) onNext()
    else setRevealed(revealed + 1)
  })

  return (
    <>
      <div className="session-card session-card--color step-enter">
        <p className="session-eyebrow">{eyebrow}</p>
        <h1 className="session-title">{title}</h1>
        <h2 className="reveal-heading">{heading}</h2>
        <ol className="reveal-list">
          {entries.map((entry, i) =>
            i < revealed ? (
              <li key={i} className="reveal reveal--open">
                {entry}
              </li>
            ) : (
              <li key={i}>
                <button
                  type="button"
                  className="reveal"
                  disabled={i !== revealed}
                  onClick={() => setRevealed(i + 1)}
                >
                  {i === revealed ? 'Antippen zum Aufdecken' : ''}
                </button>
              </li>
            ),
          )}
        </ol>
      </div>
      <LessonFooter>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {allOpen ? 'Weiter' : 'Überspringen'}
        </button>
      </LessonFooter>
    </>
  )
}
