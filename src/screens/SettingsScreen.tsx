import { IconButton, TopBar } from '../components/TopBar.tsx'
import type { Navigation } from '../lib/navigation.ts'
import { isInstalled, usePwa, type OfflineStatus } from '../lib/pwa.ts'
import { useAppState } from '../lib/store.ts'

// Die eigentlichen Einstellungen folgen in Phase 5. Der App-Status bleibt danach erhalten.

const OFFLINE_TEXT: Record<OfflineStatus, string> = {
  dev: 'Im Entwicklungsmodus aus (aktiv nach „npm run build“ + „npm run preview“)',
  native: 'Läuft als native App',
  unsupported: 'Nicht verfügbar (braucht HTTPS oder localhost)',
  pending: 'Wird vorbereitet …',
  ready: 'Bereit – funktioniert ohne Internet',
}

export function SettingsScreen({ nav }: { nav: Navigation }) {
  const pwa = usePwa()
  const { storage } = useAppState()

  return (
    <>
      <TopBar left={<IconButton icon="back" label="Kurse" onClick={nav.back} showLabel />} />
      <main className="page">
        <h1 className="page-title">Einstellungen</h1>

        <section className="card">
          <p>Lesemodus, Tempo, Schriftgröße und Darstellung kannst du hier ab Phase 5 einstellen.</p>
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
            <div>
              <dt>Speicher</dt>
              <dd>
                {storage === 'device'
                  ? 'Auf diesem Gerät'
                  : 'Nur vorübergehend – geht beim Schließen verloren'}
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </>
  )
}
