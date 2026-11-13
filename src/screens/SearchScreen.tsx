import { useMemo, useState, type CSSProperties } from 'react'
import { Icon } from '../components/Icon.tsx'
import { IconButton, TopBar } from '../components/TopBar.tsx'
import { courseColor } from '../lib/colors.ts'
import type { Navigation } from '../lib/navigation.ts'
import { searchCourses, type SearchHit } from '../lib/search.ts'
import { useAppState } from '../lib/store.ts'

const KIND_LABEL: Record<SearchHit['kind'], string> = {
  course: 'Kurs',
  tile: 'Kachel',
  page: 'Seite',
  question: 'Frage',
}

/** Suche über alle Kurse: Titel, Leseseiten und Fragen */
export function SearchScreen({ nav }: { nav: Navigation }) {
  const { courses } = useAppState()
  const [query, setQuery] = useState('')
  const hits = useMemo(() => searchCourses(courses, query), [courses, query])
  const asked = query.trim().length >= 2

  return (
    <>
      <TopBar left={<IconButton icon="back" label="Karte" onClick={nav.back} showLabel />} />
      <main className="page">
        <h1 className="page-title">Suche</h1>
        <label className="search-field">
          <Icon name="search" size={22} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Begriff, Kachel oder Kurs"
            aria-label="Suchbegriff"
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            enterKeyHint="search"
          />
        </label>

        {!asked && <p className="muted">Durchsucht Kurstitel, Kacheln, Leseseiten und Fragen in all deinen Kursen.</p>}
        {asked && hits.length === 0 && <p className="muted">Nichts gefunden für „{query.trim()}“.</p>}

        {hits.length > 0 && (
          <ul className="search-list" aria-label="Treffer">
            {hits.map((hit, i) => {
              const course = courses.find((c) => c.id === hit.courseId)
              return (
                <li key={`${hit.kind}/${hit.courseId}/${hit.tileId ?? ''}/${i}`}>
                  <button
                    type="button"
                    className="search-hit"
                    style={{ '--course': course ? courseColor(course) : 'var(--accent)' } as CSSProperties}
                    onClick={() => nav.navigate({ name: 'course', courseId: hit.courseId, tileId: hit.tileId })}
                  >
                    <span className="search-hit-kind">{KIND_LABEL[hit.kind]}</span>
                    <span className="search-hit-title">{hit.title}</span>
                    {hit.context && <span className="search-hit-context">{hit.context}</span>}
                    {hit.snippet && <span className="search-hit-snippet">{hit.snippet}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </>
  )
}
