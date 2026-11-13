import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { Token } from '../../lib/orp.ts'

/**
 * Feste Position des Fokusbuchstabens (Anteil der Breite von links).
 * Etwas links der Mitte wie bei bekannten RSVP-Readern: Der Fokus liegt im
 * Wort vorn, rechts davon steht meist der längere Teil. So passen auch lange
 * Wörter ohne Verkleinerung.
 */
export const FOCUS_X = 0.38

/** Abstand zum Rand, der immer frei bleibt (in Pixeln) */
const SAFETY = 6

/**
 * Zeigt ein Wort so, dass der rote Fokusbuchstabe immer exakt an derselben
 * Stelle steht: Der Buchstabe ist dort festgemacht, der linke Wortteil hängt
 * links daran, der rechte rechts.
 *
 * Passt ein Wort trotzdem nicht, wird die Schrift verkleinert – nie abgeschnitten.
 * Neu berechnet bei jedem Wort und bei jeder Größenänderung (ResizeObserver).
 */
export function RsvpWord({ token }: { token: Token | undefined }) {
  const layerRef = useRef<HTMLSpanElement>(null)
  const beforeRef = useRef<HTMLSpanElement>(null)
  const focusRef = useRef<HTMLSpanElement>(null)
  const afterRef = useRef<HTMLSpanElement>(null)

  const fit = useCallback(() => {
    const layer = layerRef.current
    const before = beforeRef.current
    const focus = focusRef.current
    const after = afterRef.current
    if (!layer || !before || !focus || !after) return

    // In Grundgröße messen …
    layer.style.setProperty('--rsvp-scale', '1')
    const halfFocus = focus.getBoundingClientRect().width / 2
    const needLeft = before.getBoundingClientRect().width + halfFocus
    const needRight = after.getBoundingClientRect().width + halfFocus

    // … und so weit verkleinern, dass beide Seiten neben den Fokus passen
    const width = layer.clientWidth
    const roomLeft = FOCUS_X * width - SAFETY
    const roomRight = (1 - FOCUS_X) * width - SAFETY
    const scale = Math.min(
      1,
      needLeft > 0 ? roomLeft / needLeft : 1,
      needRight > 0 ? roomRight / needRight : 1,
    )
    layer.style.setProperty('--rsvp-scale', String(Math.max(0.05, scale)))
  }, [])

  // Vor dem Zeichnen anpassen → kein kurzes Aufblitzen in falscher Größe
  useLayoutEffect(fit, [token, fit])

  // Schrift (Google Sans) erst nach dem ersten Wort geladen → neu messen
  useEffect(() => {
    let active = true
    document.fonts?.ready.then(() => active && fit())
    return () => {
      active = false
    }
  }, [fit])

  // Breite ändert sich (Drehen, Fenstergröße)
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    let lastWidth = layer.clientWidth
    const onResize = () => {
      if (layer.clientWidth === lastWidth) return
      lastWidth = layer.clientWidth
      fit()
    }
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }
    const observer = new ResizeObserver(onResize)
    observer.observe(layer)
    return () => observer.disconnect()
  }, [fit])

  return (
    <span ref={layerRef} className="rsvp-word" aria-hidden="true">
      <span className="rsvp-anchor">
        <span ref={beforeRef} className="rsvp-before">
          {token?.before}
        </span>
        <span ref={focusRef} className="rsvp-focus">
          {token?.focus}
        </span>
        <span ref={afterRef} className="rsvp-after">
          {token?.after}
        </span>
      </span>
    </span>
  )
}
