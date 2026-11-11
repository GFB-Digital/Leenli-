import { IconButton, TopBar } from '../components/TopBar.tsx'
import type { Navigation } from '../lib/navigation.ts'

// Platzhalter – Import und Verwaltung eigener Kurse folgen in Phase 5.

export function ContentScreen({ nav }: { nav: Navigation }) {
  return (
    <>
      <TopBar left={<IconButton icon="back" label="Kurse" onClick={nav.back} showLabel />} />
      <main className="page">
        <h1 className="page-title">Inhalte</h1>
        <section className="card">
          <p>
            Hier kannst du bald eigene Kurse als JSON importieren, verwalten und eine Vorlage für
            Claude kopieren. Das kommt in Phase 5.
          </p>
        </section>
      </main>
    </>
  )
}
