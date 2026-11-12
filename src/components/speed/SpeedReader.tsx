import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  clampWpm,
  formatDuration,
  remainingMs,
  sentenceBackTarget,
  sentenceStartOf,
  TIMING,
  tokenize,
  wordDuration,
  type Token,
} from '../../lib/orp.ts'
import { getAppState, updateSettings, useAppState } from '../../lib/store.ts'
import { isOnButton, isOnSlider, keepKeyboardFocus, useKeydown } from '../../lib/useKeydown.ts'
import { Icon } from '../Icon.tsx'
import { TempoControl } from '../TempoControl.tsx'
import { LessonFooter } from '../lesson/LessonFooter.tsx'
import { FOCUS_X, RsvpWord } from './RsvpWord.tsx'

/** Zweimal „Satz zurück“ innerhalb dieser Zeit → einen Satz weiter zurück */
const REPEAT_WINDOW_MS = 1500

export function SpeedReader({
  header,
  text,
  onNext,
}: {
  /** Kopfbereich (Abschnittsnummer, Umschalter, Titel) */
  header: ReactNode
  text: string
  onNext: () => void
}) {
  const { settings } = useAppState()
  const wpm = clampWpm(settings.wpm)
  const tokens = useMemo(() => tokenize(text), [text])
  const last = tokens.length - 1

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  /** Der Durchgang ist am Ende angekommen */
  const [ended, setEnded] = useState(false)
  /** Der Text wurde mindestens einmal bis zum Ende gelesen → „Weiter“ statt „Überspringen“ */
  const [completed, setCompleted] = useState(tokens.length === 0)
  const [showText, setShowText] = useState(false)

  const warmupRef = useRef(0)
  const lastBackRef = useRef<{ time: number; target: number } | null>(null)
  const currentWordRef = useRef<HTMLSpanElement>(null)

  // Taktgeber: aktuelles Wort so lange zeigen wie berechnet, dann das nächste
  useEffect(() => {
    if (!playing || tokens.length === 0) return
    const warm = warmupRef.current > 0
    const timer = window.setTimeout(
      () => {
        if (warm) warmupRef.current -= 1
        if (index < last) {
          setIndex(index + 1)
        } else {
          setPlaying(false)
          setEnded(true)
          setCompleted(true)
        }
      },
      wordDuration(tokens[index], wpm, warm),
    )
    return () => window.clearTimeout(timer)
  }, [playing, index, wpm, tokens, last])

  // App im Hintergrund (anderer Tab, Sperrbildschirm) → anhalten
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPlaying(false)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // „Ganzer Text“: aktuelles Wort beim Abspielen sichtbar halten
  useEffect(() => {
    if (showText && playing) currentWordRef.current?.scrollIntoView({ block: 'nearest' })
  }, [index, showText, playing])

  // ---- Aktionen ----

  const play = () => {
    if (tokens.length === 0) return
    if (ended) {
      setIndex(0)
      setEnded(false)
    }
    warmupRef.current = TIMING.warmupWords
    setPlaying(true)
  }

  const toggle = () => (playing ? setPlaying(false) : play())

  const seek = (target: number | ((current: number) => number)) => {
    if (tokens.length === 0) return
    // Funktions-Form: rechnet mit dem neuesten Stand, auch bei schnell wiederholten Tasten
    setIndex((current) => {
      const next = typeof target === 'function' ? target(current) : target
      return Math.min(last, Math.max(0, next))
    })
    setEnded(false)
    if (playing) warmupRef.current = TIMING.warmupWords
  }

  const sentenceBack = () => {
    const now = Date.now()
    const current = index
    const previous = lastBackRef.current
    const repeated =
      previous !== null &&
      now - previous.time < REPEAT_WINDOW_MS &&
      sentenceStartOf(tokens, current) === previous.target
    const target = sentenceBackTarget(tokens, current, repeated)
    lastBackRef.current = { time: now, target }
    seek(target)
  }

  const changeWpm = (value: number) => {
    const next = clampWpm(value)
    if (next !== clampWpm(getAppState().settings.wpm)) void updateSettings({ wpm: next }) // dauerhaft
  }

  /** Tempo um ±25 ändern – ausgehend vom neuesten gespeicherten Wert */
  const changeWpmBy = (delta: number) => changeWpm(clampWpm(getAppState().settings.wpm) + delta)

  const toggleText = () => {
    if (!showText) setPlaying(false) // zum Nachlesen anhalten
    setShowText(!showText)
  }

  // ---- Tastatur (PC) ----

  useKeydown((event) => {
    switch (event.key) {
      case ' ':
        if (isOnButton(event)) return
        event.preventDefault()
        toggle()
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        if (isOnSlider(event)) return
        event.preventDefault()
        seek((current) => current + (event.key === 'ArrowLeft' ? -1 : 1))
        break
      case 'ArrowUp':
      case 'ArrowDown':
        if (isOnSlider(event)) return
        event.preventDefault()
        changeWpmBy(event.key === 'ArrowUp' ? TIMING.wpmStep : -TIMING.wpmStep)
        break
      case 'Enter':
        if (isOnButton(event) || !completed) return
        event.preventDefault()
        onNext()
        break
    }
  })

  // ---- Anzeige ----

  const shownIndex = index // am Ende bleibt das letzte Wort stehen
  const position = tokens.length === 0 ? 0 : ended ? tokens.length : index + 1
  const remaining = ended ? 0 : remainingMs(tokens, index, wpm)

  let hint = '\u00a0'
  if (tokens.length === 0) hint = 'Dieser Abschnitt enthält keinen Text.'
  else if (ended) hint = 'Fertig gelesen. Tippe auf das Wort für einen neuen Durchgang.'
  else if (!playing && index === 0) hint = 'Tippe auf das Wort, um zu starten.'
  else if (!playing) hint = 'Pausiert – tippe auf das Wort zum Weiterlesen.'

  const paragraphs = useMemo(() => {
    const groups: { token: Token; i: number }[][] = []
    tokens.forEach((token, i) => (groups[token.paragraph] ??= []).push({ token, i }))
    return groups
  }, [tokens])

  return (
    <>
      <div className="lesson-content step-enter">
        {header}

        <div className="speed-reader">
          <button
            type="button"
            className="rsvp-stage"
            style={{ '--rsvp-focus-x': `${FOCUS_X * 100}%` } as CSSProperties}
            onClick={toggle}
            onMouseDown={keepKeyboardFocus}
            aria-label={playing ? 'Pause' : 'Start'}
          >
            {/* Führungslinien; die Markierungen sitzen genau über/unter dem Fokusbuchstaben */}
            <span className="rsvp-line rsvp-line--top" aria-hidden="true" />
            <span className="rsvp-line rsvp-line--bottom" aria-hidden="true" />
            <RsvpWord token={tokens[shownIndex]} />
          </button>
          <p className="rsvp-hint" aria-live="polite">
            {hint}
          </p>

          <div className="rsvp-position">
            <input
              type="range"
              className="slider"
              min={0}
              max={Math.max(0, last)}
              step={1}
              value={shownIndex}
              disabled={tokens.length === 0}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Position im Text"
              aria-valuetext={`Wort ${position} von ${tokens.length}`}
            />
            <div className="rsvp-meta">
              <span>
                Wort {position} / {tokens.length}
              </span>
              <span>noch {formatDuration(remaining)}</span>
            </div>
          </div>

          <div className="rsvp-controls">
            <button
              type="button"
              className="rsvp-side-btn"
              onClick={sentenceBack}
              onMouseDown={keepKeyboardFocus}
              disabled={tokens.length === 0}
            >
              <Icon name="sentenceBack" />
              <span>Satz zurück</span>
            </button>
            <button
              type="button"
              className="rsvp-play"
              data-state={playing ? 'playing' : 'paused'}
              onClick={toggle}
              onMouseDown={keepKeyboardFocus}
              disabled={tokens.length === 0}
              aria-label={playing ? 'Pause' : 'Start'}
            >
              <Icon name={playing ? 'pause' : 'play'} size={28} />
            </button>
            <button
              type="button"
              className="rsvp-side-btn"
              onClick={toggleText}
              onMouseDown={keepKeyboardFocus}
              aria-pressed={showText}
              title="Ganzen Text anzeigen"
            >
              <Icon name="text" />
              <span>Ganzer Text</span>
            </button>
          </div>

          <div className="rsvp-tempo-box">
            <TempoControl wpm={wpm} onChange={changeWpm} />
          </div>

          {showText && (
            <div className="rsvp-fulltext reading-text">
              {paragraphs.map((group, p) => (
                <p key={p}>
                  {group.map(({ token, i }) => (
                    <span key={i}>
                      <span
                        ref={i === shownIndex ? currentWordRef : undefined}
                        className={i === shownIndex ? 'rsvp-ft-word is-current' : 'rsvp-ft-word'}
                        onClick={() => seek(i)}
                      >
                        {token.text}
                      </span>{' '}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <LessonFooter>
        {completed ? (
          <button type="button" className="btn btn-primary" onClick={onNext}>
            Weiter
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={onNext}>
            Überspringen
          </button>
        )}
      </LessonFooter>
    </>
  )
}
