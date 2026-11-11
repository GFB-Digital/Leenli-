// Ansichts-Steuerung ohne Router-Paket.
//
// Die aktuelle Ansicht ist einfacher React-State. Zusätzlich wird jeder
// Wechsel im Browser-Verlauf vermerkt, damit die Zurück-Taste (Browser,
// Android, später auch die Capacitor-App) eine Ansicht zurückgeht, statt die
// App zu schließen. Die Adresse (URL) bleibt dabei immer gleich.

import { useCallback, useEffect, useRef, useState } from 'react'

export type View =
  | { name: 'home' }
  | { name: 'course'; courseId: string }
  | { name: 'lesson'; courseId: string; lessonId: string }
  | { name: 'content' }
  | { name: 'settings' }

interface NavState {
  leenli: true
  view: View
  /** wie viele Ansichten über der Startseite liegen */
  depth: number
}

const HOME: NavState = { leenli: true, view: { name: 'home' }, depth: 0 }

function isNavState(value: unknown): value is NavState {
  return typeof value === 'object' && value !== null && (value as NavState).leenli === true
}

function currentNavState(): NavState {
  return isNavState(history.state) ? history.state : HOME
}

export function useNavigation() {
  const [nav, setNavState] = useState<NavState>(currentNavState)
  const navRef = useRef(nav)

  const setNav = useCallback((next: NavState) => {
    navRef.current = next
    setNavState(next)
  }, [])

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    if (!isNavState(history.state)) history.replaceState(HOME, '')
    const onPopState = (event: PopStateEvent) => {
      setNav(isNavState(event.state) ? event.state : HOME)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [setNav])

  // Neue Ansicht beginnt oben
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [nav])

  /** Neue Ansicht öffnen (Zurück führt wieder hierher) */
  const navigate = useCallback((view: View) => {
    const next: NavState = { leenli: true, view, depth: navRef.current.depth + 1 }
    history.pushState(next, '')
    setNav(next)
  }, [setNav])

  /** Eine Ansicht zurück – wie die Zurück-Taste */
  const back = useCallback(() => {
    if (navRef.current.depth > 0) {
      history.back()
    } else {
      history.replaceState(HOME, '')
      setNav(HOME)
    }
  }, [setNav])

  /** Aktuelle Ansicht ersetzen, ohne einen Zurück-Schritt anzulegen */
  const replace = useCallback((view: View) => {
    const next: NavState = { leenli: true, view, depth: navRef.current.depth }
    history.replaceState(next, '')
    setNav(next)
  }, [setNav])

  return { view: nav.view, navigate, back, replace }
}

export type Navigation = ReturnType<typeof useNavigation>
