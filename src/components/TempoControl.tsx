import { TIMING } from '../lib/orp.ts'
import { keepKeyboardFocus } from '../lib/useKeydown.ts'

/** Tempo des Speed-Readers: Regler 100–1000 in 25er-Schritten plus −/+ */
export function TempoControl({
  wpm,
  onChange,
  label = 'Tempo',
}: {
  wpm: number
  onChange: (wpm: number) => void
  label?: string
}) {
  return (
    <div className="tempo">
      <div className="tempo-head">
        <span>{label}</span>
        <span className="tempo-value">
          <strong>{wpm}</strong> Wörter/Min.
        </span>
      </div>
      <div className="tempo-row">
        <button
          type="button"
          className="round-btn"
          onClick={() => onChange(wpm - TIMING.wpmStep)}
          onMouseDown={keepKeyboardFocus}
          disabled={wpm <= TIMING.minWpm}
          aria-label="Langsamer"
        >
          −
        </button>
        <input
          type="range"
          className="slider"
          min={TIMING.minWpm}
          max={TIMING.maxWpm}
          step={TIMING.wpmStep}
          value={wpm}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={`${label} in Wörtern pro Minute`}
        />
        <button
          type="button"
          className="round-btn"
          onClick={() => onChange(wpm + TIMING.wpmStep)}
          onMouseDown={keepKeyboardFocus}
          disabled={wpm >= TIMING.maxWpm}
          aria-label="Schneller"
        >
          +
        </button>
      </div>
    </div>
  )
}
