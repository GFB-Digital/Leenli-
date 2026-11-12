import type { SessionItem } from '../../lib/session.ts'
import { Icon } from '../Icon.tsx'

/**
 * Leiste oben: ein Punkt pro Seite, ein Schild pro Frage, Ringe für
 * Einleitung und Rückblick. Angehängte Wiederholungen erscheinen hinten.
 */
export function SessionProgress({
  items,
  index,
  retries,
}: {
  items: SessionItem[]
  index: number
  retries: number
}) {
  return (
    <div className="session-progress">
      <div
        className="session-track"
        role="progressbar"
        aria-label="Fortschritt"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={Math.min(index, items.length)}
      >
        {items.map((item, i) => {
          const shape =
            item.kind === 'question' ? (item.retry ? 'retry' : 'question') : item.kind === 'page' ? 'page' : 'ring'
          const state = i < index ? 'done' : i === index ? 'current' : 'todo'
          return <span key={i} className={`marker marker--${shape} marker--${state}`} />
        })}
      </div>
      {retries > 0 && (
        <span className="retry-chip" title="Fragen, die noch einmal kommen">
          <Icon name="shieldFilled" size={14} />
          {retries}
        </span>
      )}
    </div>
  )
}
