import { installUpdate } from '../lib/pwa.ts'

export function UpdateBanner() {
  return (
    <div className="update-banner" role="status">
      <span>Neue Version verfügbar</span>
      <button type="button" className="btn btn-primary btn-small" onClick={installUpdate}>
        Aktualisieren
      </button>
    </div>
  )
}
