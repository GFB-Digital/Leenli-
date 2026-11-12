import { useEffect, useRef } from 'react'

/** Felder, in denen Tasten zum Schreiben gebraucht werden */
const TYPING_TARGETS =
  'textarea, select, [contenteditable="true"], dialog, ' +
  'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"])'

/**
 * Tastatur-Kürzel für den PC. Ignoriert Eingaben in Textfeldern, offenen
 * Dialogen und Tastenkombinationen mit Strg/Alt/Cmd.
 */
export function useKeydown(handler: (event: KeyboardEvent) => void, active = true) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!active) return
    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest(TYPING_TARGETS)) return
      handlerRef.current(event)
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [active])
}

/** Enter/Leertaste auf einem Button löst diesen ohnehin aus – dann nicht doppelt reagieren */
export function isOnButton(event: KeyboardEvent): boolean {
  return event.target instanceof Element && event.target.closest('button') !== null
}

/**
 * Für onMouseDown von Bedien-Buttons: Ein Mausklick wählt den Button nicht aus.
 * Sonst würde z. B. die Leertaste danach diesen Button auslösen statt
 * Start/Pause. Mit der Tab-Taste bleiben die Buttons trotzdem erreichbar.
 */
export function keepKeyboardFocus(event: { preventDefault: () => void }) {
  event.preventDefault()
}

/** Pfeiltasten verschieben einen ausgewählten Schieberegler selbst */
export function isOnSlider(event: KeyboardEvent): boolean {
  return event.target instanceof HTMLInputElement && event.target.type === 'range'
}
