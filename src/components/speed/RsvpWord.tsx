import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { Token } from '../../lib/orp.ts'

/** Abstand zum Rand, der immer frei bleibt (in Pixeln, je Seite) */
const SAFETY = 4

/**
 * Zeigt ein Wort so, dass der rote Fokusbuchstabe immer genau in der Mitte steht:
 * linker Wortteil rechtsbündig, rechter Teil linksbündig.
 *
 * Damit lange Wörter nie abgeschnitten werden, wird die Schrift verkleinert,
 * sobald die längere Wortseite nicht mehr in ihre Bildschirmhälfte passt.
 * Die Größe wird bei jedem Wort und bei jeder Größenänderung neu berechnet.
 */
export function RsvpWord({ token }: { token: Token | undefined }) {
  const boxRef = useRef<HTMLSpanElement>(null)
  const beforeRef = useRef<HTMLSpanElement>(null)
  const focusRef = useRef<HTMLSpanElement>(null)
  const afterRef = useRef<HTMLSpanElement>(null)

  const fit = useCallback(() => {
    const box = boxRef.current
    const before = beforeRef.current
    const focus = focusRef.current
    const after = afterRef.current
    if (!box || !before || !focus || !after) return

    // In Grundgröße messen …
    box.style.setProperty('--rsvp-scale', '1')
    const beforeWidth = before.getBoundingClientRect().width
    const afterWidth = after.getBoundingClientRect().width
    const focusWidth = focus.getBoundingClientRect().width

    // … und so weit verkleinern, dass beide Seiten in ihre Hälfte passen
    const needed = 2 * Math.max(beforeWidth, afterWidth) + focusWidth
    const available = box.clientWidth - 2 * SAFETY
    const scale = needed > available && needed > 0 ? available / needed : 1
    box.style.setProperty('--rsvp-scale', String(scale))
  }, [])

  // Vor dem Zeichnen anpassen → kein kurzes Aufblitzen in falscher Größe
  useLayoutEffect(fit, [token, fit])

  // Breite des Bildschirms ändert sich (Drehen, Fenstergröße)
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    let lastWidth = box.clientWidth
    const onResize = () => {
      if (box.clientWidth === lastWidth) return
      lastWidth = box.clientWidth
      fit()
    }
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }
    const observer = new ResizeObserver(onResize)
    observer.observe(box)
    return () => observer.disconnect()
  }, [fit])

  return (
    <span ref={boxRef} className="rsvp-word" aria-hidden="true">
      <span className="rsvp-before">
        <span ref={beforeRef}>{token?.before}</span>
      </span>
      <span ref={focusRef} className="rsvp-focus">
        {token?.focus}
      </span>
      <span className="rsvp-after">
        <span ref={afterRef}>{token?.after}</span>
      </span>
    </span>
  )
}
