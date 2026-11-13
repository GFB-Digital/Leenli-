import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { Icon } from '../components/Icon.tsx'
import { LessonFooter } from '../components/lesson/LessonFooter.tsx'
import { PageView } from '../components/session/PageView.tsx'
import { QuestionCard } from '../components/session/QuestionCard.tsx'
import { RevealCard } from '../components/session/RevealCard.tsx'
import { SessionProgress } from '../components/session/SessionProgress.tsx'
import { IconButton } from '../components/TopBar.tsx'
import { courseColor } from '../lib/colors.ts'
import { cardKey, guessChance, nextTile, tileQuestions, tileStatus } from '../lib/model.ts'
import type { Navigation } from '../lib/navigation.ts'
import {
  advance,
  answer,
  firstTryStats,
  isFinished,
  lookupQuestion,
  pendingRetries,
  reviewItems,
  startSession,
  tileItems,
  type QuestionRef,
  type TileMode,
} from '../lib/session.ts'
import { formatDue } from '../lib/srs.ts'
import { EXAM, hardCards, pickForExam, pickForReview, planSmartSession } from '../lib/smart.ts'
import { addReadingTime, finishReview, finishTile, getAppState, startTile, useAppState, type ReviewResult } from '../lib/store.ts'
import { currentStreak, dayKey, hasStamp } from '../lib/streak.ts'
import { isQuestion, type Course, type ReadingMode, type Tile } from '../lib/types.ts'

export type SessionSpec =
  | { kind: 'tile'; course: Course; tile: Tile; mode: TileMode }
  | { kind: 'review'; refs: QuestionRef[]; title: string; round: number; courseId?: string; hard?: boolean }
  /** Prüfung: jede Frage einmal, Rückmeldung erst am Ende */
  | { kind: 'exam'; course: Course; refs: QuestionRef[]; round: number }

/** Antworten einer Runde für den Speicher aufbereiten (Ratewahrscheinlichkeit, Kachel gelernt?) */
function toResults(firstTry: Record<string, boolean>, refs: QuestionRef[]): ReviewResult[] {
  const { courses, learn } = getAppState()
  const results: ReviewResult[] = []
  for (const ref of refs) {
    const found = lookupQuestion(courses, ref)
    if (!found || !(found.key in firstTry)) continue
    results.push({
      key: found.key,
      courseId: ref.courseId,
      correct: firstTry[found.key],
      guess: guessChance(found.step),
      learned: tileStatus(learn, ref.courseId, ref.tileId) === 'done',
    })
  }
  return results
}

/** Pausen über 3 Minuten zählen nicht als Lernzeit */
const MAX_STEP_MS = 180_000

export function SessionScreen({ spec, nav }: { spec: SessionSpec; nav: Navigation }) {
  const app = useAppState()
  const [session, setSession] = useState(() =>
    startSession(spec.kind === 'tile' ? tileItems(spec.course.id, spec.tile, spec.mode) : reviewItems(spec.refs)),
  )
  const [mode, setMode] = useState<ReadingMode>(app.settings.readingMode)
  const [confirmClose, setConfirmClose] = useState(false)
  // Für die Zusammenfassung: Gab es heute schon einen Lerntag-Stempel?
  const [hadStampToday] = useState(() => hasStamp(app.learn.days[dayKey()]))
  const activeMs = useRef(0)
  const lastTick = useRef(Date.now())
  const saved = useRef(false)

  const tick = () => {
    const now = Date.now()
    activeMs.current += Math.min(now - lastTick.current, MAX_STEP_MS)
    lastTick.current = now
  }

  const finished = isFinished(session)
  const sessionRef = useRef(session)
  sessionRef.current = session

  // Kachel als „gerade am Lernen“ markieren
  useEffect(() => {
    if (spec.kind === 'tile' && spec.mode === 'learn') void startTile(spec.course.id, spec.tile.id)
  }, [spec])

  // Ergebnis einmalig speichern, sobald alles durch ist
  useEffect(() => {
    if (!finished || saved.current) return
    saved.current = true
    tick()
    const ms = activeMs.current
    if (spec.kind === 'tile') {
      if (spec.mode === 'learn') void finishTile(spec.course.id, spec.tile.id, session.firstTry, ms)
      else void addReadingTime(spec.course.id, ms)
    } else {
      void finishReview(toResults(session.firstTry, spec.refs), ms, {
        examOf: spec.kind === 'exam' ? spec.course.id : undefined,
      })
    }
  }, [finished, spec, session.firstTry])

  // Runde vorzeitig verlassen (Schließen oder Zurück-Taste): Was schon beantwortet
  // ist, zählt trotzdem für die Wiederholung – nur der Lerntag-Stempel entfällt.
  useEffect(
    () => () => {
      if (saved.current || spec.kind === 'tile') return
      const results = toResults(sessionRef.current.firstTry, spec.refs)
      if (results.length === 0) return
      saved.current = true
      void finishReview(results, activeMs.current, { complete: false })
    },
    [spec],
  )

  // Neuer Schritt beginnt oben
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [session.index])

  const goNext = () => {
    tick()
    setSession((s) => advance(s))
  }

  const requestClose = () => {
    if (session.index > 0 && !finished) setConfirmClose(true)
    else nav.back()
  }

  const item = session.items[session.index]
  const itemCourse = item ? app.courses.find((c) => c.id === item.courseId) : undefined
  const itemTile = itemCourse?.tiles.find((t) => t.id === item?.tileId)
  const color = courseColor(itemCourse ?? (spec.kind === 'review' ? { id: 'leenli' } : spec.course))

  // Seitenzählung je Kachel („Seite 2 / 3“)
  const pageNumbers = useMemo(() => {
    const map = new Map<string, { page: number; pages: number }>()
    if (spec.kind === 'tile') {
      const pages = spec.tile.steps.map((s, i) => ({ s, i })).filter(({ s }) => !isQuestion(s))
      pages.forEach(({ i }, n) => map.set(`${spec.tile.id}:${i}`, { page: n + 1, pages: pages.length }))
    }
    return map
  }, [spec])

  let content: ReactNode = null
  if (spec.kind !== 'tile' && spec.refs.length === 0) {
    content = (
      <Empty
        text={
          spec.kind === 'exam'
            ? 'Dieser Kurs hat noch keine Fragen, die sich prüfen lassen.'
            : spec.hard
              ? 'Keine schwierigen Fragen – bisher lag keine Frage mehrfach daneben.'
              : 'Noch nichts zu wiederholen. Lerne zuerst eine Kachel – danach kannst du dein Wissen hier stärken.'
        }
        onDone={nav.back}
      />
    )
  } else if (finished) {
    content = <Summary spec={spec} session={session} hadStampToday={hadStampToday} nav={nav} />
  } else if (item && itemCourse && itemTile) {
    if (item.kind === 'intro' || item.kind === 'recap') {
      content = (
        <RevealCard
          key={session.index}
          eyebrow={itemCourse.title}
          title={itemTile.title}
          heading={item.kind === 'intro' ? 'Du lernst …' : 'Rückblick'}
          entries={(item.kind === 'intro' ? itemTile.intro : itemTile.recap) ?? []}
          onNext={goNext}
        />
      )
    } else if (item.kind === 'page') {
      const step = itemTile.steps[item.step]
      const numbers = pageNumbers.get(`${itemTile.id}:${item.step}`) ?? { page: 1, pages: 1 }
      content =
        step && step.type === 'text' ? (
          <PageView
            key={session.index}
            step={step}
            courseTitle={itemCourse.title}
            tileTitle={itemTile.title}
            page={numbers.page}
            pages={numbers.pages}
            mode={mode}
            onModeChange={setMode}
            onNext={goNext}
          />
        ) : null
    } else {
      const found = lookupQuestion(app.courses, item)
      content = found ? (
        <QuestionCard
          key={session.index}
          step={found.step}
          context={
            spec.kind === 'review'
              ? `${itemCourse.title} · ${itemTile.title}`
              : spec.kind === 'exam'
                ? `Frage ${session.index + 1} von ${session.items.length}`
                : itemTile.title
          }
          retry={item.retry}
          exam={spec.kind === 'exam'}
          onAnswer={(correct) => setSession((s) => answer(s, found.key, correct, spec.kind !== 'exam'))}
          onNext={goNext}
        />
      ) : null
    }
  }

  // Sollte ein Schritt fehlen (Kurs inzwischen geändert), einfach weiter
  useEffect(() => {
    if (!finished && content === null) setSession((s) => advance(s))
  })

  return (
    <div className="lesson session" style={{ '--course': color } as CSSProperties}>
      <header className="topbar lesson-topbar">
        <div className="topbar-inner">
          <IconButton icon="close" label="Sitzung schließen" onClick={requestClose} />
          <SessionProgress items={session.items} index={session.index} retries={pendingRetries(session)} />
        </div>
      </header>

      <main className="lesson-main" aria-label={spec.kind === 'tile' ? spec.tile.title : spec.kind === 'exam' ? 'Prüfung' : spec.title}>
        {content}
      </main>

      <ConfirmDialog
        open={confirmClose}
        title="Sitzung beenden?"
        message={
          <p>
            {spec.kind === 'tile'
              ? spec.mode === 'learn'
                ? 'Die Kachel bleibt angefangen. Beim nächsten Mal beginnt sie von vorn.'
                : 'Du kannst die Kachel jederzeit wieder öffnen.'
              : spec.kind === 'exam'
                ? 'Die Prüfung wird dann nicht gewertet. Deine bisherigen Antworten zählen trotzdem für die Wiederholung.'
                : 'Deine bisherigen Antworten bleiben gespeichert.'}
          </p>
        }
        confirmLabel="Beenden"
        cancelLabel="Weiterlernen"
        onConfirm={() => {
          setConfirmClose(false)
          nav.back()
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  )
}

function Empty({ text, onDone }: { text: string; onDone: () => void }) {
  return (
    <>
      <div className="lesson-content summary step-enter">
        <p className="summary-text">{text}</p>
      </div>
      <LessonFooter>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Zurück
        </button>
      </LessonFooter>
    </>
  )
}

function Summary({
  spec,
  session,
  hadStampToday,
  nav,
}: {
  spec: SessionSpec
  session: ReturnType<typeof startSession>
  hadStampToday: boolean
  nav: Navigation
}) {
  const { learn, courses } = useAppState()
  const { correct, total } = firstTryStats(session)
  const today = dayKey()
  const stampNow = hasStamp(learn.days[today])
  const streak = currentStreak(learn.days, today)
  const now = Date.now()

  let title: string
  let subtitle: string | null = null
  let nextReview: string | null = null
  let upNext: string | null = null
  let primary: { label: string; onClick: () => void }
  let secondary: { label: string; onClick: () => void } | null = null
  /** Prüfung: Ergebnis je Kachel, schwächste zuerst */
  let breakdown: { title: string; correct: number; total: number }[] = []

  if (spec.kind === 'exam') {
    title = 'Prüfung beendet'
    subtitle = spec.course.title
    const perTile = new Map<string, { title: string; correct: number; total: number }>()
    for (const ref of spec.refs) {
      const found = lookupQuestion(courses, ref)
      if (!found || !(found.key in session.firstTry)) continue
      const entry = perTile.get(ref.tileId) ?? { title: found.tile.title, correct: 0, total: 0 }
      entry.total++
      if (session.firstTry[found.key]) entry.correct++
      perTile.set(ref.tileId, entry)
    }
    breakdown = [...perTile.values()].sort((a, b) => a.correct / a.total - b.correct / b.total)
    primary = { label: 'Fertig', onClick: nav.back }
    secondary = {
      label: 'Neue Prüfung',
      onClick: () => nav.replace({ name: 'exam', courseId: spec.course.id, round: spec.round + 1 }),
    }
  } else if (spec.kind === 'tile') {
    const course = courses.find((c) => c.id === spec.course.id) ?? spec.course
    if (spec.mode === 'read') {
      title = 'Gelesen'
      subtitle = spec.tile.title
    } else {
      title = 'Kachel geschafft!'
      subtitle = spec.tile.title
      const dues = tileQuestions(spec.tile)
        .map(({ step }) => learn.cards[cardKey(course.id, spec.tile.id, step)]?.due)
        .filter((due): due is number => due !== undefined)
      if (dues.length > 0) nextReview = `Erste Wiederholung ${formatDue(Math.min(...dues), now)}`
    }
    const next = spec.mode === 'learn' ? nextTile(course, learn) : undefined
    if (next) {
      upNext = `Als Nächstes: ${next.title}`
      primary = {
        label: 'Nächste Kachel',
        onClick: () => nav.replace({ name: 'tile', courseId: course.id, tileId: next.id, mode: 'learn' }),
      }
      secondary = { label: 'Zur Übersicht', onClick: nav.back }
    } else {
      primary = { label: 'Zur Übersicht', onClick: nav.back }
    }
  } else {
    title = 'Wissen gestärkt!'
    subtitle = spec.title
    primary = { label: 'Fertig', onClick: nav.back }
    secondary = {
      label: 'Noch eine Runde',
      onClick: () => nav.replace({ name: 'review', courseId: spec.courseId, round: spec.round + 1, hard: spec.hard }),
    }
  }

  const color = courseColor(spec.kind === 'review' ? { id: 'leenli', color: 'indigo' } : spec.course)
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
    <>
      <div className="lesson-content summary step-enter">
        <span className="summary-hex" style={{ '--course': color } as CSSProperties} aria-hidden="true">
          <Icon name={spec.kind === 'tile' ? 'check' : 'shield'} size={40} />
        </span>
        <h2 className="summary-title">{title}</h2>
        {subtitle && <p className="eyebrow">{subtitle}</p>}

        {total > 0 && (
          <p className="summary-score">
            <span className="summary-number">{correct}</span> von {total}{' '}
            {spec.kind === 'exam' ? `richtig (${percent} %)` : spec.kind === 'review' ? 'sofort gewusst' : 'auf Anhieb richtig'}
          </p>
        )}
        {breakdown.length > 0 && (
          <ul className="exam-breakdown" aria-label="Ergebnis je Kachel">
            {breakdown.map((entry) => (
              <li key={entry.title} className={entry.correct < entry.total ? 'exam-row exam-row--weak' : 'exam-row'}>
                <span>{entry.title}</span>
                <strong>
                  {entry.correct} / {entry.total}
                </strong>
              </li>
            ))}
          </ul>
        )}
        {spec.kind === 'exam' && breakdown.some((entry) => entry.correct < entry.total) && (
          <p className="summary-text">Kacheln mit Fehlern stehen oben. Im Kursblatt kannst du sie nochmal lesen.</p>
        )}
        {nextReview && <p className="summary-text">{nextReview}</p>}
        {upNext && <p className="summary-text">{upNext}</p>}

        {stampNow && (
          <p className="summary-stamp">
            <Icon name="hexFilled" size={18} />
            {!hadStampToday ? `Neuer Lerntag! Serie: ${streak} ${streak === 1 ? 'Tag' : 'Tage'}` : `Serie: ${streak} ${streak === 1 ? 'Tag' : 'Tage'}`}
          </p>
        )}
      </div>

      <LessonFooter>
        {secondary && (
          <button type="button" className="btn btn-secondary" onClick={secondary.onClick}>
            {secondary.label}
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={primary.onClick}>
          {primary.label}
        </button>
      </LessonFooter>
    </>
  )
}

/** „Wissen stärken“: wählt die Fragen der Runde einmal beim Öffnen */
export function ReviewSession({
  courseId,
  round,
  hard = false,
  nav,
}: {
  courseId?: string
  round: number
  /** nur Fragen, die schon mehrfach falsch waren */
  hard?: boolean
  nav: Navigation
}) {
  const [spec] = useState<SessionSpec>(() => {
    const { courses, learn, settings } = getAppState()
    const refs = hard
      ? hardCards(courses, learn, courseId).slice(0, settings.reviewBatch)
      : pickForReview(courses, learn, Date.now(), settings.reviewBatch, courseId)
    const course = courseId ? courses.find((c) => c.id === courseId) : undefined
    const what = hard ? 'Schwierige Fragen' : 'Wissen stärken'
    return { kind: 'review', refs, title: course ? `${what}: ${course.title}` : what, round, courseId, hard }
  })
  return <SessionScreen spec={spec} nav={nav} />
}

/** Prüfung über einen Kurs: wählt die Fragen einmal beim Öffnen */
export function ExamSession({ course, round, nav }: { course: Course; round: number; nav: Navigation }) {
  const [spec] = useState<SessionSpec>(() => ({ kind: 'exam', course, refs: pickForExam(course, EXAM.size), round }))
  return <SessionScreen spec={spec} nav={nav} />
}

/** „Schlau lernen“: entscheidet einmal beim Öffnen, was gerade am sinnvollsten ist */
export function SmartSession({ nav }: { nav: Navigation }) {
  const [plan] = useState(() => {
    const { courses, learn, settings } = getAppState()
    return planSmartSession(courses, learn, Date.now(), settings.reviewBatch)
  })
  if (plan.kind === 'tile') {
    return <SessionScreen spec={{ kind: 'tile', course: plan.course, tile: plan.tile, mode: 'learn' }} nav={nav} />
  }
  if (plan.kind === 'review') {
    const title = plan.reason === 'due' ? 'Fällige Wiederholungen' : 'Wissen stärken'
    return <SessionScreen spec={{ kind: 'review', refs: plan.refs, title, round: 1 }} nav={nav} />
  }
  return <SessionScreen spec={{ kind: 'review', refs: [], title: 'Schlau lernen', round: 1 }} nav={nav} />
}
