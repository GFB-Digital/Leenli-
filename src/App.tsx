import { installUpdate, isInstalled, usePwa, type OfflineStatus } from './lib/pwa.ts'

// Phase 1: Platzhalter-Startseite, die das Grund-Design und den PWA-Status zeigt.
// Ab Phase 2 steuert App.tsx die Ansichten (Start, Kurs, Lektion, Inhalte, Einstellungen).

const OFFLINE_TEXT: Record<OfflineStatus, string> = {
  dev: 'Im Entwicklungsmodus aus – aktiv nach „npm run build“ + „npm run preview“',
  native: 'Läuft als native App',
  unsupported: 'Nicht verfügbar (braucht HTTPS oder localhost)',
  pending: 'Wird vorbereitet …',
  ready: 'Bereit – funktioniert ohne Internet',
}

export default function App() {
  const pwa = usePwa()

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">Leenli</span>
        </div>
      </header>

      <main className="page">
        <h1 className="page-title">Willkommen bei Leenli</h1>
        <p className="lead">
          Das Grundgerüst steht. Ab Phase 2 erscheinen hier deine Kurse.
        </p>

        <section className="card">
          <h2 className="card-title">Leseprobe</h2>
          <p className="reading">
            Wer lernt, vergisst – aber nicht gleichmäßig. Kurze Abschnitte, gefolgt von einer
            Frage, halten die Aufmerksamkeit wach und machen sichtbar, was hängen geblieben ist.
          </p>
        </section>

        <section className="card">
          <h2 className="card-title">Speed-Reader (Vorschau)</h2>
          <div className="orp-preview" aria-label="Beispielwort Lernen mit rotem Fokusbuchstaben">
            <span className="orp-left">Le</span>
            <span className="orp-focus">r</span>
            <span className="orp-right">nen</span>
          </div>
          <p className="muted small">Der rote Fokusbuchstabe steht immer an derselben Stelle.</p>
        </section>

        <section className="card">
          <h2 className="card-title">App-Status</h2>
          <dl className="status-list">
            <div>
              <dt>Läuft als</dt>
              <dd>{isInstalled() ? 'Installierte App' : 'Browser-Tab'}</dd>
            </div>
            <div>
              <dt>Offline</dt>
              <dd>{OFFLINE_TEXT[pwa.offline]}</dd>
            </div>
          </dl>
        </section>
      </main>

      {pwa.updateAvailable && (
        <div className="update-banner" role="status">
          <span>Neue Version verfügbar</span>
          <button type="button" className="btn btn-primary btn-small" onClick={installUpdate}>
            Aktualisieren
          </button>
        </div>
      )}
    </div>
  )
}
