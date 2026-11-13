import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { courseColor } from '../../lib/colors.ts'
import { LEVEL_LABEL, masteryLevel, tileMastery } from '../../lib/mastery.ts'
import { cardKey, courseStats, formatStudyTime, nextTile, plural, tileQuestions, tileStats, tileStatus } from '../../lib/model.ts'
import type { Navigation } from '../../lib/navigation.ts'
import { dueCards, examPlan, examPlanText } from '../../lib/smart.ts'
import { formatDue } from '../../lib/srs.ts'
import { resetTile, setExamDate, useAppState } from '../../lib/store.ts'
import { dayKey } from '../../lib/streak.ts'
import type { Course, Tile } from '../../lib/types.ts'
import { useKeydown } from '../../lib/useKeydown.ts'
import { ConfirmDialog } from '../ConfirmDialog.tsx'
import { Icon } from '../Icon.tsx'

function ProgressRing({ percent }: { percent: number }) {
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <svg className="ring" viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r={r} className="ring-track" />
      <circle
        cx="28"
        cy="28"
        r={r}
        className="ring-fill"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - percent / 100)}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="29" className="ring-text">
        {percent}%
      </text>
    </svg>
  )
}

export function CourseSheet({
  course,
  focusTileId,
  nav,
  onClose,
}: {
  course: Course
  focusTileId?: string
  nav: Navigation
  onClose: () => void
}) {
  const { learn, courses } = useAppState()
  const [openTile, setOpenTile] = useState<string | undefined>(focusTileId)
  const [toReset, setToReset] = useState<Tile | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const { done, total, percent } = courseStats(course, learn)
  const next = nextTile(course, learn)
  const now = Date.now()
  const atRisk = dueCards(courses, learn, now, course.id).length
  const color = courseColor(course)
  const examDate = learn.examDates?.[course.id] ?? ''
  const plan = examPlan(course, learn, now)
  const lastExam = learn.exams?.[course.id]
  const hasQuestions = course.tiles.some((tile) => tileQuestions(tile).length > 0)

  useEffect(() => setOpenTile(focusTileId), [focusTileId])

  // Angetippte Kachel ins Bild holen
  useEffect(() => {
    if (!openTile) return
    listRef.current
      ?.querySelector(`[data-tile-row="${CSS.escape(openTile)}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [openTile])

  useKeydown((event) => {
    if (event.key === 'Escape') onClose()
  })

  const learnTile = (tile: Tile) => nav.navigate({ name: 'tile', courseId: course.id, tileId: tile.id, mode: 'learn' })
  const readTile = (tile: Tile) => nav.navigate({ name: 'tile', courseId: course.id, tileId: tile.id, mode: 'read' })

  let primary: { label: string; onClick: () => void }
  if (next) {
    const started = done > 0 || tileStatus(learn, course.id, next.id) === 'learning'
    primary = { label: started ? 'Weiterlernen' : 'Kurs starten', onClick: () => learnTile(next) }
  } else {
    primary = { label: 'Wissen stärken', onClick: () => nav.navigate({ name: 'review', courseId: course.id, round: 1 }) }
  }

  return (
    <>
      <section
        className="sheet"
        role="dialog"
        aria-label={course.title}
        style={{ '--course': color } as CSSProperties}
      >
        <button type="button" className="sheet-handle" onClick={onClose} aria-label="Kursblatt schließen" />
        <button type="button" className="sheet-close icon-btn" onClick={onClose} aria-label="Schließen">
          <Icon name="close" />
        </button>

        <div className="sheet-hero" aria-hidden="true">
          <span>{course.emoji ?? '📘'}</span>
        </div>
        <h2 className="sheet-title">{course.title}</h2>
        {course.description && <p className="sheet-desc">{course.description}</p>}

        <div className="sheet-stats">
          <div>
            <strong>{total}</strong>
            <span>{total === 1 ? 'Kachel' : 'Kacheln'}</span>
          </div>
          <div>
            <ProgressRing percent={percent} />
            <span>Fortschritt</span>
          </div>
          <div>
            <strong>{formatStudyTime(learn.courseMs[course.id] ?? 0)}</strong>
            <span>gelernt</span>
          </div>
        </div>

        <button type="button" className="btn btn-primary btn-course" onClick={primary.onClick}>
          <Icon name={next ? 'bolt' : 'shield'} size={20} />
          {primary.label}
        </button>
        {next && done > 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-course"
            onClick={() => nav.navigate({ name: 'review', courseId: course.id, round: 1 })}
          >
            <Icon name="shield" size={20} />
            Wissen stärken{atRisk > 0 ? ` (${atRisk} fällig)` : ''}
          </button>
        )}

        <h3 className="section-label">Kacheln</h3>
        <ol ref={listRef} className="tile-list">
          {course.tiles.map((tile, i) => {
            const status = tileStatus(learn, course.id, tile.id)
            const { pages, questions } = tileStats(tile)
            const dues = tileQuestions(tile)
              .map(({ step }) => learn.cards[cardKey(course.id, tile.id, step)]?.due)
              .filter((due): due is number => due !== undefined)
            const level = LEVEL_LABEL[masteryLevel(tileMastery(course, tile, learn, now))]
            const meta =
              status === 'done'
                ? dues.length > 0
                  ? `${level} · Wiederholung ${formatDue(Math.min(...dues), now)}`
                  : level
                : status === 'learning'
                  ? 'Angefangen'
                  : [plural(pages, 'Seite', 'Seiten'), questions > 0 ? plural(questions, 'Frage', 'Fragen') : '']
                      .filter(Boolean)
                      .join(' · ')
            const open = openTile === tile.id
            return (
              <li key={tile.id} data-tile-row={tile.id} className={open ? 'tile-row tile-row--open' : 'tile-row'}>
                <button
                  type="button"
                  className="tile-row-main"
                  aria-expanded={open}
                  onClick={() => setOpenTile(open ? undefined : tile.id)}
                >
                  <span className={`tile-hex tile-hex--${status}`} aria-hidden="true">
                    {status === 'done' ? <Icon name="check" size={18} /> : i + 1}
                  </span>
                  <span className="tile-row-body">
                    <span className="tile-row-title">{tile.title}</span>
                    <span className="tile-row-meta">{meta}</span>
                  </span>
                  <Icon name="chevron" size={18} />
                </button>
                {open && (
                  <div className="tile-actions">
                    {status !== 'done' ? (
                      <button type="button" className="btn btn-primary btn-small" onClick={() => learnTile(tile)}>
                        <Icon name="bolt" size={18} /> {status === 'learning' ? 'Weiterlernen' : 'Lernen'}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-primary btn-small" onClick={() => readTile(tile)}>
                        <Icon name="book" size={18} /> Nochmal lesen
                      </button>
                    )}
                    {status !== 'new' && (
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => setToReset(tile)}>
                        <Icon name="reset" size={18} /> Zurücksetzen
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        <h3 className="section-label">Prüfung</h3>
        {/* Prüfung: Termin, Tagespensum, Probe-Prüfung */}
        <div className="sheet-exam">
          <label className="sheet-exam-date">
            <span>Prüfungstermin</span>
            <input
              type="date"
              value={examDate}
              min={dayKey(now)}
              onChange={(event) => void setExamDate(course.id, event.target.value || null)}
            />
          </label>
          {plan && <p className="sheet-exam-plan">{examPlanText(plan)}</p>}
          {hasQuestions && (
            <button
              type="button"
              className="btn btn-secondary btn-course"
              onClick={() => nav.navigate({ name: 'exam', courseId: course.id, round: 1 })}
            >
              <Icon name="check" size={20} />
              Prüfung starten
            </button>
          )}
          <p className="sheet-exam-note">
            {lastExam
              ? `Letzte Prüfung: ${lastExam.correct} von ${lastExam.total} richtig (${new Date(lastExam.at).toLocaleDateString('de-DE')})`
              : 'Gemischte Fragen aus allen Kacheln, Auswertung erst am Ende.'}
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={toReset !== null}
        title={`„${toReset?.title ?? ''}“ zurücksetzen?`}
        message={<p>Die Kachel gilt dann wieder als neu, und ihre Fragen verlieren den Wiederholungsstand. Du kannst sie danach neu lernen.</p>}
        confirmLabel="Zurücksetzen"
        onConfirm={() => {
          if (toReset) void resetTile(course.id, toReset.id)
          setToReset(null)
        }}
        onCancel={() => setToReset(null)}
      />
    </>
  )
}
