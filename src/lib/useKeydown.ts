import { useEffect, useRef } from 'react'

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
      if (target?.closest('input, textarea, select, [contenteditable="true"], dialog')) return
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
