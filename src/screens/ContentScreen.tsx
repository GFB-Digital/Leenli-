import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { CourseBadge } from '../components/CourseBadge.tsx'
import { Icon } from '../components/Icon.tsx'
import { IconButton, TopBar } from '../components/TopBar.tsx'
import { claudeTemplate } from '../content/claude-template.ts'
import { backupFileName, createBackup, isBackup, parseBackup, type BackupOutcome } from '../lib/backup.ts'
import { copyText } from '../lib/clipboard.ts'
import { requestPersistentStorage } from '../lib/db.ts'
import { saveTextFile } from '../lib/files.ts'
import { MAX_ERRORS, extractJson, parseCourses, withFreshIds } from '../lib/importer.ts'
import { plural } from '../lib/model.ts'
import type { Navigation } from '../lib/navigation.ts'
import {
  deleteCourse,
  getAppState,
  importCourses,
  isBuiltinCourse,
  restoreBackup,
  updateSettings,
  useAppState,
} from '../lib/store.ts'
import type { Course } from '../lib/types.ts'

type Result =
  | { kind: 'success'; courses: Course[]; notes: string[] }
  | { kind: 'error'; errors: string[] }

interface PendingImport {
  courses: Course[]
  conflicts: Course[]
  notes: string[]
}

type ReadBackup = Extract<BackupOutcome, { ok: true }>

const formatDate = (time: number) => new Date(time).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })

/** Ist der eingefügte Text eine Sicherung statt eines Kurses? */
function looksLikeBackup(raw: string): boolean {
  try {
    return isBackup(JSON.parse(extractJson(raw)))
  } catch {
    return false
  }
}

export function ContentScreen({ nav }: { nav: Navigation }) {
  const { courses, importedCourses, learn, settings } = useAppState()
  const [input, setInput] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [toDelete, setToDelete] = useState<Course | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const backupFileRef = useRef<HTMLInputElement>(null)
  const [pendingBackup, setPendingBackup] = useState<ReadBackup | null>(null)
  const [backupNote, setBackupNote] = useState<{ ok: boolean; lines: string[] } | null>(null)

  const template = useMemo(() => claudeTemplate(), [])
  const importedIds = new Set(importedCourses.map((c) => c.id))

  const showResult = (next: Result) => {
    setResult(next)
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
  }

  // ---- Import ----

  const runImport = (raw: string) => {
    // Eine Sicherung im Kurs-Feld → richtig einordnen statt mit Kurs-Fehlern zu antworten
    if (looksLikeBackup(raw)) {
      openBackup(extractJson(raw))
      setInput('')
      return
    }
    const outcome = parseCourses(raw)
    if (!outcome.ok) {
      showResult({ kind: 'error', errors: outcome.errors })
      return
    }
    const existing = new Set(getAppState().courses.map((c) => c.id))
    const conflicts = outcome.courses.filter((c) => existing.has(c.id))
    if (conflicts.length > 0) {
      setPending({ courses: outcome.courses, conflicts, notes: outcome.notes })
    } else {
      void finishImport(outcome.courses, outcome.notes)
    }
  }

  const finishImport = async (list: Course[], notes: string[]) => {
    setPending(null)
    await importCourses(list)
    void requestPersistentStorage()
    setInput('')
    showResult({ kind: 'success', courses: list, notes })
  }

  const onFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // dieselbe Datei später erneut wählbar
    if (!file) return
    try {
      const text = await file.text()
      setInput(text)
      runImport(text)
    } catch {
      showResult({ kind: 'error', errors: ['Die Datei konnte nicht gelesen werden.'] })
    }
  }

  // Strg/Cmd + Enter im Textfeld = Importieren
  const onInputKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && input.trim()) {
      event.preventDefault()
      runImport(input)
    }
  }

  // ---- Sicherung ----

  const saveBackup = async () => {
    const now = new Date()
    const backup = createBackup({ courses: importedCourses, learn, settings }, now)
    try {
      const saved = await saveTextFile(backupFileName(now), JSON.stringify(backup))
      if (saved === 'cancelled') return
      await updateSettings({ lastBackupAt: now.getTime() })
      setBackupNote({
        ok: true,
        lines: [
          saved === 'shared'
            ? 'Sicherung übergeben. Lege sie am besten in „Dateien“ oder in deiner Cloud ab.'
            : `Sicherung gespeichert: ${backupFileName(now)} (im Download-Ordner).`,
        ],
      })
    } catch {
      setBackupNote({ ok: false, lines: ['Die Sicherung konnte nicht gespeichert werden.'] })
    }
  }

  const openBackup = (text: string) => {
    const outcome = parseBackup(text)
    if (outcome.ok) {
      setBackupNote(null)
      setPendingBackup(outcome)
    } else {
      setBackupNote({ ok: false, lines: outcome.errors })
    }
  }

  const onBackupChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      openBackup(await file.text())
    } catch {
      setBackupNote({ ok: false, lines: ['Die Datei konnte nicht gelesen werden.'] })
    }
  }

  const applyBackup = async () => {
    if (!pendingBackup) return
    const { backup } = pendingBackup
    setPendingBackup(null)
    await restoreBackup({ courses: backup.courses, learn: backup.learn, settings: backup.settings })
    void requestPersistentStorage()
    setResult(null)
    setBackupNote({ ok: true, lines: ['Sicherung eingespielt. Kurse, Lernstand und Einstellungen sind wiederhergestellt.'] })
  }

  const hasProgress = Object.keys(learn.cards).length > 0
  const backupAge = settings.lastBackupAt ? Math.floor((Date.now() - settings.lastBackupAt) / 86_400_000) : null

  // ---- Vorlage ----

  const copyTemplate = async () => {
    const ok = await copyText(template)
    setCopyState(ok ? 'copied' : 'failed')
    window.setTimeout(() => setCopyState('idle'), 2500)
  }

  // ---- Anzeige ----

  const existingTitle = (course: Course) =>
    courses.find((c) => c.id === course.id)?.title ?? course.title
  const conflictBuiltin = pending?.conflicts.some((c) => isBuiltinCourse(c.id)) ?? false
  const deleteRestoresBuiltin = toDelete ? isBuiltinCourse(toDelete.id) : false

  return (
    <>
      <TopBar left={<IconButton icon="back" label="Kurse" onClick={nav.back} showLabel />} />

      <main className="page">
        <h1 className="page-title">Inhalte</h1>

        {/* Import */}
        <section className="card">
          <h2 className="card-title">Kurs importieren</h2>
          <p className="muted">
            Füge hier das JSON ein, das Claude für dich erstellt hat – oder wähle eine .json-Datei.
          </p>
          <textarea
            className="json-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onInputKey}
            placeholder={'{\n  "id": "…",\n  "title": "…",\n  "tiles": [ … ]\n}'}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Kurs als JSON"
            rows={8}
          />
          <div className="button-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!input.trim()}
              onClick={() => runImport(input)}
            >
              Importieren
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
              <Icon name="file" size={20} />
              Datei wählen
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json,text/plain"
              hidden
              onChange={onFileChosen}
            />
          </div>

          <div ref={resultRef}>
            {result?.kind === 'success' && (
              <div className="result result--success" role="status">
                <p className="result-title">
                  {result.courses.length === 1
                    ? `„${result.courses[0].title}“ wurde importiert.`
                    : `${result.courses.length} Kurse wurden importiert.`}
                </p>
                <ul className="result-list">
                  {result.courses.map((course) => (
                    <li key={course.id}>
                      {course.title}: {plural(course.tiles.length, 'Kachel', 'Kacheln')}
                    </li>
                  ))}
                  {result.notes.map((note) => (
                    <li key={note} className="muted">
                      {note}
                    </li>
                  ))}
                </ul>
                {result.courses.length === 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => nav.navigate({ name: 'course', courseId: result.courses[0].id })}
                  >
                    Kurs öffnen
                  </button>
                )}
              </div>
            )}

            {result?.kind === 'error' && (
              <div className="result result--error" role="alert">
                <p className="result-title">Import nicht möglich</p>
                <ul className="result-list">
                  {result.errors.slice(0, MAX_ERRORS).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {result.errors.length > MAX_ERRORS && (
                    <li>… und {result.errors.length - MAX_ERRORS} weitere Fehler.</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Sicherung */}
        <section className="card">
          <h2 className="card-title">Sicherung</h2>
          <p className="muted">
            Deine Kurse und dein Lernstand liegen nur auf diesem Gerät. Eine Sicherungsdatei schützt sie, wenn du die App neu
            installierst, das Gerät wechselst oder der Browser seinen Speicher leert.
          </p>
          <p className={hasProgress && (backupAge === null || backupAge > 14) ? 'backup-age backup-age--old' : 'backup-age'}>
            {settings.lastBackupAt
              ? `Letzte Sicherung: ${formatDate(settings.lastBackupAt)}${backupAge !== null && backupAge > 14 ? ` – das ist ${backupAge} Tage her` : ''}`
              : hasProgress
                ? 'Du hast noch keine Sicherung gespeichert.'
                : 'Noch keine Sicherung.'}
          </p>
          <div className="button-row">
            <button type="button" className="btn btn-primary" onClick={() => void saveBackup()}>
              <Icon name="export" size={20} />
              Sicherung speichern
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => backupFileRef.current?.click()}>
              <Icon name="import" size={20} />
              Sicherung einspielen
            </button>
            <input ref={backupFileRef} type="file" accept=".json,application/json,text/plain" hidden onChange={onBackupChosen} />
          </div>
          {backupNote && (
            <div className={backupNote.ok ? 'result result--success' : 'result result--error'} role={backupNote.ok ? 'status' : 'alert'}>
              <ul className="result-list">
                {backupNote.lines.slice(0, MAX_ERRORS).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Vorlage */}
        <section className="card">
          <h2 className="card-title">Vorlage für Claude</h2>
          <p className="muted">
            Kopiere die Vorlage, füge sie bei Claude ein und trage dein Wunschthema ein. Claudes
            Antwort fügst du oben ein.
          </p>
          <div className="button-row">
            <button type="button" className="btn btn-secondary" onClick={copyTemplate}>
              <Icon name={copyState === 'copied' ? 'check' : 'copy'} size={20} />
              {copyState === 'copied' ? 'Kopiert' : 'Vorlage kopieren'}
            </button>
          </div>
          {copyState === 'failed' && (
            <p className="small muted" role="alert">
              Kopieren hat nicht geklappt. Öffne „Vorlage ansehen“ und kopiere den Text von Hand.
            </p>
          )}
          <details className="template">
            <summary>Vorlage ansehen</summary>
            <pre className="template-text">{template}</pre>
          </details>
        </section>

        {/* Kurse verwalten */}
        <section className="card">
          <h2 className="card-title">Deine Kurse</h2>
          <ul className="manage-list">
            {courses.map((course) => {
              const imported = importedIds.has(course.id)
              const origin = !imported
                ? 'Beispielkurs'
                : isBuiltinCourse(course.id)
                  ? 'ersetzt den Beispielkurs'
                  : 'importiert'
              return (
                <li key={course.id} className="manage-row">
                  <CourseBadge course={course} />
                  <span className="manage-body">
                    <span className="manage-title">{course.title}</span>
                    <span className="manage-meta">
                      {plural(course.tiles.length, 'Kachel', 'Kacheln')} · {origin}
                    </span>
                  </span>
                  {imported && (
                    <IconButton
                      icon="trash"
                      label={`„${course.title}“ löschen`}
                      onClick={() => setToDelete(course)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
          {importedCourses.length === 0 && (
            <p className="small muted">Der Beispielkurs ist fest eingebaut und kann nicht gelöscht werden.</p>
          )}
        </section>
      </main>

      {/* Rückfrage: Kurs schon vorhanden */}
      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.conflicts.length === 1
            ? `„${existingTitle(pending.conflicts[0])}“ ist schon vorhanden`
            : `${pending?.conflicts.length ?? 0} Kurse sind schon vorhanden`
        }
        message={
          <>
            <p>
              {pending?.conflicts.length === 1
                ? pending.conflicts[0].title === existingTitle(pending.conflicts[0])
                  ? 'Einen Kurs mit derselben ID hast du schon.'
                  : `Dein Import „${pending.conflicts[0].title}“ hat dieselbe ID wie dieser Kurs.`
                : `Diese Kurse haben dieselbe ID wie vorhandene: ${pending?.conflicts
                    .map((c) => `„${existingTitle(c)}“`)
                    .join(', ')}.`}{' '}
              Beim Ersetzen bleibt dein Fortschritt für Kacheln mit gleicher ID erhalten.
            </p>
            {conflictBuiltin && (
              <p>
                Der eingebaute Beispielkurs wird durch deine Version ersetzt. Löschst du sie später,
                kommt der Beispielkurs zurück.
              </p>
            )}
          </>
        }
        confirmLabel="Ersetzen"
        alternative={{
          label: 'Als neuen Kurs hinzufügen',
          onClick: () => {
            if (!pending) return
            void finishImport(withFreshIds(pending.courses, getAppState().courses), pending.notes)
          },
        }}
        onConfirm={() => pending && void finishImport(pending.courses, pending.notes)}
        onCancel={() => setPending(null)}
      />

      {/* Rückfrage: Sicherung einspielen */}
      <ConfirmDialog
        open={pendingBackup !== null}
        title="Sicherung einspielen?"
        message={
          pendingBackup && (
            <>
              <p>
                {pendingBackup.summary.exportedAt ? `Sicherung vom ${formatDate(pendingBackup.summary.exportedAt)}: ` : 'Die Sicherung enthält: '}
                {plural(pendingBackup.summary.courses, 'Kurs', 'Kurse')}, {plural(pendingBackup.summary.tiles, 'gelernte Kachel', 'gelernte Kacheln')},{' '}
                {plural(pendingBackup.summary.cards, 'Frage', 'Fragen')} mit Wiederholungsstand.
              </p>
              <p>
                Deine jetzigen Kurse, dein Lernstand und deine Einstellungen auf diesem Gerät werden dadurch <strong>ersetzt</strong>. Das
                lässt sich nicht rückgängig machen.
              </p>
            </>
          )
        }
        confirmLabel="Einspielen"
        onConfirm={() => void applyBackup()}
        onCancel={() => setPendingBackup(null)}
      />

      {/* Rückfrage: Kurs löschen */}
      <ConfirmDialog
        open={toDelete !== null}
        title={`„${toDelete?.title ?? ''}“ löschen?`}
        message={
          <p>
            Der Kurs und dein Fortschritt darin werden von diesem Gerät entfernt.
            {deleteRestoresBuiltin && ' Danach ist wieder der eingebaute Beispielkurs da.'}
          </p>
        }
        confirmLabel="Löschen"
        onConfirm={() => {
          if (toDelete) void deleteCourse(toDelete.id)
          setToDelete(null)
          setResult(null)
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
