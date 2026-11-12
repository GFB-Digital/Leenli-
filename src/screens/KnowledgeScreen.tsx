import { useEffect, useState, type CSSProperties } from 'react'
import { Icon } from '../components/Icon.tsx'
import { IconButton, TopBar } from '../components/TopBar.tsx'
import { courseColor } from '../lib/colors.ts'
import { cardKey, courseStats, formatStudyTime, tileQuestions, tileStatus } from '../lib/model.ts'
import type { Navigation } from '../lib/navigation.ts'
import { atRiskCards } from '../lib/smart.ts'
import { daysUntilForgetting, isAtRisk, median, PROGNOSIS_MARKS, prognosisPosition } from '../lib/srs.ts'
import { useAppState } from '../lib/store.ts'
import { currentStreak, dayKey, hasStamp, monthGrid, MONTHS, totalStamps, weekKeys, WEEKDAYS } from '../lib/streak.ts'
import type { Course } from '../lib/types.ts'

interface TileChip {
  course: Course
  tileId: string
  title: string
  /** je Frage: sicher (true) oder gefährdet (false) */
  dots: boolean[]
}

export function KnowledgeScreen({ nav, section }: { nav: Navigation; section?: 'days' }) {
  const { courses, learn } = useAppState()
  const now = Date.now()
  const today = dayKey(now)

  useEffect(() => {
    if (section === 'days') document.getElementById('lerntage')?.scrollIntoView({ block: 'start' })
  }, [section])

  // ---- Wissensbank: jede gelernte Kachel als Kette von Punkten ----
  const chips: TileChip[] = []
  for (const course of courses) {
    for (const tile of course.tiles) {
      if (tileStatus(learn, course.id, tile.id) !== 'done') continue
      const dots = tileQuestions(tile)
        .map(({ step }) => learn.cards[cardKey(course.id, tile.id, step)])
        .filter((card) => card !== undefined)
        .map((card) => !isAtRisk(card, now))
      if (dots.length > 0) chips.push({ course, tileId: tile.id, title: tile.title, dots })
    }
  }
  const safe = chips.filter((chip) => chip.dots.every(Boolean))
  const risky = chips.filter((chip) => !chip.dots.every(Boolean))
  const due = atRiskCards(courses, learn, now).length

  // ---- Kurse mit Fortschritt ----
  const active = courses.filter((course) =>
    course.tiles.some((tile) => tileStatus(learn, course.id, tile.id) !== 'new'),
  )

  // ---- Statistik ----
  const totalMs = Object.values(learn.days).reduce((sum, day) => sum + day.ms, 0)
  const tilesDone = courses.reduce((sum, course) => sum + courseStats(course, learn).done, 0)
  const stamps = totalStamps(learn.days)
  const streak = currentStreak(learn.days, today)
  const quota = learn.answers.total > 0 ? Math.round((learn.answers.correct / learn.answers.total) * 100) : 0

  const chipView = (chip: TileChip, risk: boolean) => (
    <button
      key={`${chip.course.id}/${chip.tileId}`}
      type="button"
      className={risk ? 'kb-chip kb-chip--risk' : 'kb-chip'}
      style={{ '--course': courseColor(chip.course) } as CSSProperties}
      title={`${chip.course.title}: ${chip.title}`}
      aria-label={`${chip.title}: ${chip.dots.filter(Boolean).length} von ${chip.dots.length} Fragen sicher`}
      onClick={() => nav.navigate({ name: 'course', courseId: chip.course.id, tileId: chip.tileId })}
    >
      {chip.dots.map((ok, i) => (
        <span key={i} className={ok ? 'kb-dot' : 'kb-dot kb-dot--risk'} />
      ))}
    </button>
  )

  return (
    <>
      <TopBar left={<IconButton icon="back" label="Karte" onClick={nav.back} showLabel />} />
      <main className="page knowledge">
        <h1 className="page-title">Wissensbank</h1>

        <section className="kb-stats" aria-label="Überblick">
          <div>
            <Icon name="octFilled" size={26} />
            <strong>{stamps}</strong>
            <span>Lerntage</span>
          </div>
          <div>
            <Icon name="book" size={26} />
            <strong>{formatStudyTime(totalMs)}</strong>
            <span>Lernzeit</span>
          </div>
          <div>
            <Icon name="check" size={26} />
            <strong>{tilesDone}</strong>
            <span>Kacheln</span>
          </div>
        </section>

        {/* Sicher / gefährdet */}
        <section className="card kb-card">
          <h2 className="kb-heading">
            Dein Wissen <Icon name="knowledge" size={26} />
          </h2>
          {chips.length === 0 ? (
            <p className="muted">
              Sobald du eine Kachel gelernt hast, erscheinen ihre Fragen hier – als Punkte, die zeigen, wie sicher du sie
              noch weißt.
            </p>
          ) : (
            <>
              <h3 className="kb-sub">Sicher</h3>
              {safe.length > 0 ? <div className="kb-chips">{safe.map((c) => chipView(c, false))}</div> : <p className="muted small">Gerade nichts – zeit zum Stärken!</p>}
              <h3 className="kb-sub">Droht vergessen zu werden</h3>
              {risky.length > 0 ? <div className="kb-chips">{risky.map((c) => chipView(c, true))}</div> : <p className="muted small">Nichts gefährdet. Sehr gut!</p>}
              <button type="button" className="btn btn-primary btn-course" onClick={() => nav.navigate({ name: 'review', round: 1 })}>
                <Icon name="shield" size={20} />
                Wissen stärken{due > 0 ? ` (${due} fällig)` : ''}
              </button>
              <p className="muted small">Du kannst so oft stärken, wie du möchtest – zuerst kommen die schwächsten Fragen.</p>
            </>
          )}
        </section>

        {/* Gerade am Lernen */}
        {active.length > 0 && (
          <section className="card kb-card">
            <h2 className="kb-heading">Gerade am Lernen</h2>
            <ul className="kb-courses">
              {active.map((course) => {
                const { percent } = courseStats(course, learn)
                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      className="kb-course"
                      style={{ '--course': courseColor(course) } as CSSProperties}
                      onClick={() => nav.navigate({ name: 'course', courseId: course.id })}
                    >
                      <span className="kb-course-head">
                        <span>{course.title} ›</span>
                        <strong>{percent}%</strong>
                      </span>
                      <span className="kb-octes" aria-hidden="true">
                        {course.tiles.map((tile) => {
                          const status = tileStatus(learn, course.id, tile.id)
                          return (
                            <span key={tile.id} className={`kb-oct kb-oct--${status}`}>
                              {status === 'done' && <Icon name="check" size={14} />}
                            </span>
                          )
                        })}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* Prognose */}
        <section className="card kb-card">
          <h2 className="kb-heading">Gedächtnis-Prognose</h2>
          <p className="muted small">
            So lange weißt du das Gelernte voraussichtlich noch (mit mindestens 80 % Wahrscheinlichkeit). Jede
            Wiederholung schiebt den Punkt nach rechts.
          </p>
          {courses.map((course) => {
            const days = Object.entries(learn.cards)
              .filter(([key]) => key.startsWith(`${course.id}::`))
              .map(([, card]) => daysUntilForgetting(card, now))
            if (days.length === 0) return null
            const position = prognosisPosition(median(days))
            return (
              <div key={course.id} className="prognosis" style={{ '--course': courseColor(course) } as CSSProperties}>
                <span className="prognosis-title">
                  <span aria-hidden="true">{course.emoji}</span> {course.title}
                </span>
                <span className="prognosis-bar">
                  <span className="prognosis-fill" style={{ width: `${position * 100}%` }} />
                  <span className="prognosis-pin" style={{ left: `${position * 100}%` }}>
                    <Icon name="shield" size={18} />
                  </span>
                </span>
                <span className="prognosis-marks">
                  {PROGNOSIS_MARKS.map((mark) => (
                    <span key={mark.label}>{mark.label}</span>
                  ))}
                </span>
              </div>
            )
          })}
          {Object.keys(learn.cards).length === 0 && <p className="muted small">Noch keine gelernten Kacheln.</p>}
        </section>

        {/* Lerntage */}
        <section id="lerntage" className="card kb-card">
          <h2 className="kb-heading">Lerntage</h2>
          <Stamps days={learn.days} today={today} stamps={stamps} streak={streak} />
        </section>

        {/* Statistik */}
        <section className="card kb-card">
          <h2 className="kb-heading">Lernstatistik</h2>
          <dl className="kb-statlist">
            <div>
              <dt>Gesamte Lernzeit</dt>
              <dd>{formatStudyTime(totalMs)}</dd>
            </div>
            <div>
              <dt>Kurse begonnen</dt>
              <dd>{active.length}</dd>
            </div>
            <div>
              <dt>Kacheln gelernt</dt>
              <dd>{tilesDone}</dd>
            </div>
            <div>
              <dt>Fragen beantwortet</dt>
              <dd>{learn.answers.total}</dd>
            </div>
            <div>
              <dt>Auf Anhieb richtig</dt>
              <dd>{quota} %</dd>
            </div>
            <div>
              <dt>Längste Serie bisher</dt>
              <dd>{longestStreak(learn.days)} {longestStreak(learn.days) === 1 ? 'Tag' : 'Tage'}</dd>
            </div>
          </dl>
        </section>
      </main>
    </>
  )
}

function longestStreak(days: Record<string, { tiles: number; reviews: number }>): number {
  const keys = Object.keys(days).filter((key) => hasStamp({ ...days[key], ms: 0 })).sort()
  let best = 0
  let run = 0
  let previous: number | null = null
  for (const key of keys) {
    const [y, m, d] = key.split('-').map(Number)
    const t = Date.UTC(y, m - 1, d) / 86_400_000
    run = previous !== null && t - previous === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = t
  }
  return best
}

function Stamps({
  days,
  today,
  stamps,
  streak,
}: {
  days: Record<string, { tiles: number; reviews: number; ms: number }>
  today: string
  stamps: number
  streak: number
}) {
  const [month, setMonth] = useState(() => {
    const [y, m] = today.split('-').map(Number)
    return { year: y, month: m - 1 }
  })
  const week = weekKeys(today)
  const thisWeek = week.filter((key) => hasStamp(days[key])).length
  const grid = monthGrid(month.year, month.month)
  const inMonth = grid.filter((key) => key && hasStamp(days[key])).length
  const shift = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const date = new Date(year, m + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })

  return (
    <>
      <div className="stamp-hero">
        <span className="stamp-big" aria-hidden="true">
          <Icon name="octFilled" size={84} />
          <strong>{stamps}</strong>
        </span>
        <div>
          <p className="stamp-hero-title">{stamps === 1 ? '1 Lerntag' : `${stamps} Lerntage`}</p>
          <p className="muted">
            {hasStamp(days[today]) ? 'Heute geschafft ✓' : 'Heute noch offen – eine Kachel oder Wiederholung genügt.'}
          </p>
          <p className="muted small">Aktuelle Serie: {streak} {streak === 1 ? 'Tag' : 'Tage'}</p>
        </div>
      </div>

      <div className="week">
        <div className="week-head">
          <span>Diese Woche</span>
          <strong>{thisWeek} von 7</strong>
        </div>
        <div className="week-row">
          {week.map((key, i) => (
            <span key={key} className={key === today ? 'week-day week-day--today' : 'week-day'}>
              <span className={hasStamp(days[key]) ? 'mini-stamp mini-stamp--on' : 'mini-stamp'}>
                <Icon name="octFilled" size={30} />
              </span>
              <span>{WEEKDAYS[i]}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="calendar">
        <div className="calendar-head">
          <button type="button" className="icon-btn" aria-label="Vorheriger Monat" onClick={() => shift(-1)}>
            <Icon name="back" />
          </button>
          <strong>
            {MONTHS[month.month]} {month.year}
          </strong>
          <button type="button" className="icon-btn" aria-label="Nächster Monat" onClick={() => shift(1)}>
            <Icon name="chevron" />
          </button>
        </div>
        <div className="calendar-grid">
          {WEEKDAYS.map((day) => (
            <span key={day} className="calendar-weekday">
              {day}
            </span>
          ))}
          {grid.map((key, i) =>
            key ? (
              <span key={key} className={key === today ? 'calendar-day calendar-day--today' : 'calendar-day'}>
                <span className="calendar-num">{Number(key.slice(8))}</span>
                {hasStamp(days[key]) && (
                  <span className="mini-stamp mini-stamp--on" aria-label="Lerntag">
                    <Icon name="octFilled" size={26} />
                  </span>
                )}
              </span>
            ) : (
              <span key={`leer-${i}`} />
            ),
          )}
        </div>
        <p className="calendar-foot">
          {MONTHS[month.month]}: {inMonth} {inMonth === 1 ? 'Lerntag' : 'Lerntage'}
        </p>
      </div>
    </>
  )
}
