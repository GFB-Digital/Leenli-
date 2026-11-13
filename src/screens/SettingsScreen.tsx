import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { SegmentedControl } from '../components/SegmentedControl.tsx'
import { TempoControl } from '../components/TempoControl.tsx'
import { IconButton, TopBar } from '../components/TopBar.tsx'
import { isStoragePersistent } from '../lib/db.ts'
import type { Navigation } from '../lib/navigation.ts'
import { clampWpm } from '../lib/orp.ts'
import { isInstalled, usePwa, type OfflineStatus } from '../lib/pwa.ts'
import { resetProgress, updateSettings, useAppState } from '../lib/store.ts'
import type { FontSize, ReadingMode, Theme } from '../lib/types.ts'

const READING_MODES: { value: ReadingMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'speed', label: 'Speed' },
]

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'S', label: 'Klein' },
  { value: 'M', label: 'Normal' },
  { value: 'L', label: 'Groß' },
  { value: 'XL', label: 'Riesig' },
]

const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Automatisch' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
]

const OFFLINE_TEXT: Record<OfflineStatus, string> = {
  dev: 'Im Entwicklungsmodus aus (aktiv nach „npm run build“ + „npm run preview“)',
  native: 'Läuft als native App',
  unsupported: 'Nicht verfügbar (braucht HTTPS oder localhost)',
  pending: 'Wird vorbereitet …',
  ready: 'Bereit – funktioniert ohne Internet',
}

export function SettingsScreen({ nav }: { nav: Navigation }) {
  const pwa = usePwa()
  const { settings, storage, learn } = useAppState()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [persistent, setPersistent] = useState<boolean | null>(null)

  useEffect(() => {
    void isStoragePersistent().then(setPersistent)
  }, [])

  const hasProgress = Object.keys(learn.cards).length > 0 || Object.values(learn.tiles).some((tiles) => Object.keys(tiles).length > 0)

  return (
    <>
      <TopBar left={<IconButton icon="back" label="Kurse" onClick={nav.back} showLabel />} />
      <main className="page">
        <h1 className="page-title">Einstellungen</h1>

        <section className="card settings-group">
          <h2 className="card-title">Lesen</h2>

          <div className="setting">
            <div className="setting-text">
              <span className="setting-label">Standard-Lesemodus</span>
              <span className="setting-hint">
                Damit beginnt jeder Leseabschnitt. Auf jeder Seite kannst du jederzeit umschalten.
              </span>
            </div>
            <SegmentedControl
              label="Standard-Lesemodus"
              value={settings.readingMode}
              options={READING_MODES}
              onChange={(readingMode) => void updateSettings({ readingMode })}
              fill
            />
          </div>

          <div className="setting">
            <TempoControl
              label="Speed-Tempo"
              wpm={clampWpm(settings.wpm)}
              onChange={(wpm) => void updateSettings({ wpm: clampWpm(wpm) })}
            />
          </div>

          <div className="setting">
            <div className="setting-text">
              <span className="setting-label">Schriftgröße</span>
            </div>
            <SegmentedControl
              label="Schriftgröße"
              value={settings.fontSize}
              options={FONT_SIZES}
              onChange={(fontSize) => void updateSettings({ fontSize })}
              fill
            />
            <p className="reading-text font-preview">
              So sieht dein Lesetext aus. Wähle die Größe, mit der du entspannt lesen kannst.
            </p>
          </div>
        </section>

        <section className="card settings-group">
          <h2 className="card-title">Wiederholen</h2>
          <div className="setting">
            <div className="setting-text">
              <span className="setting-label">Fragen pro Runde</span>
              <span className="setting-hint">So viele Fragen kommen bei „Wissen stärken“ und „Schlau lernen“ auf einmal.</span>
            </div>
            <SegmentedControl
              label="Fragen pro Runde"
              value={String(settings.reviewBatch)}
              options={['5', '10', '15', '20'].map((value) => ({ value, label: value }))}
              onChange={(value) => void updateSettings({ reviewBatch: Number(value) })}
              fill
            />
          </div>
        </section>

        <section className="card settings-group">
          <h2 className="card-title">Darstellung</h2>
          <div className="setting">
            <SegmentedControl
              label="Darstellung"
              value={settings.theme}
              options={THEMES}
              onChange={(theme) => void updateSettings({ theme })}
              fill
            />
            <span className="setting-hint">„Automatisch“ folgt der Einstellung deines Geräts.</span>
          </div>
          <div className="setting">
            <div className="setting-text">
              <span className="setting-label">3D-Karte (Test)</span>
              <span className="setting-hint">
                Kacheln als Säulen, je höher, desto mehr Seiten und Fragen. Drehen mit zwei Fingern, am PC mit Umschalt + Mausrad.
              </span>
            </div>
            <SegmentedControl
              label="3D-Karte"
              value={settings.map3d ? 'on' : 'off'}
              options={[
                { value: 'off', label: 'Aus' },
                { value: 'on', label: 'An' },
              ]}
              onChange={(value) => void updateSettings({ map3d: value === 'on' })}
              fill
            />
          </div>
        </section>

        <section className="card settings-group">
          <h2 className="card-title">Fortschritt</h2>
          <div className="setting">
            <span className="setting-hint">
              Alle Kacheln gelten wieder als neu, der Wiederholungsstand wird gelöscht. Kurse, Einstellungen, Lerntage und Lernzeit bleiben erhalten.
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!hasProgress}
              onClick={() => setConfirmReset(true)}
            >
              Fortschritt zurücksetzen
            </button>
            {resetDone && (
              <p className="small muted" role="status">
                Der Fortschritt wurde zurückgesetzt.
              </p>
            )}
          </div>
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
                {storage === 'memory'
                  ? 'Nur vorübergehend – geht beim Schließen verloren'
                  : persistent
                    ? 'Auf diesem Gerät, dauerhaft geschützt'
                    : 'Auf diesem Gerät'}
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <ConfirmDialog
        open={confirmReset}
        title="Fortschritt zurücksetzen?"
        message={<p>Alle Kacheln gelten wieder als neu, der Wiederholungsstand wird gelöscht. Das lässt sich nicht rückgängig machen.</p>}
        confirmLabel="Zurücksetzen"
        onConfirm={() => {
          void resetProgress()
          setConfirmReset(false)
          setResetDone(true)
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  )
}
