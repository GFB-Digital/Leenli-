// Darstellung (Hell/Dunkel) und Schriftgröße auf die ganze App anwenden

import type { FontSize, Settings, Theme } from './types.ts'

/** Faktor für alle Lesetexte, Fragen und den Speed-Reader */
export const FONT_SCALE: Record<FontSize, number> = { S: 0.9, M: 1, L: 1.12, XL: 1.25 }

/** Entspricht --bg in global.css (für die Browser-/Statusleiste) */
const BAR_COLOR = { light: '#f7f3ea', dark: '#15141a' } as const

export function applyAppearance(settings: Pick<Settings, 'theme' | 'fontSize'>) {
  const root = document.documentElement
  const theme: Theme = settings.theme

  // „auto“ → kein Attribut, dann entscheidet prefers-color-scheme im CSS
  if (theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = theme

  root.style.setProperty('--font-scale', String(FONT_SCALE[settings.fontSize] ?? 1))

  // Farbe der Browser-Leiste passend halten
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const forSystemDark = (meta.media ?? '').includes('dark')
    const color = theme === 'auto' ? (forSystemDark ? BAR_COLOR.dark : BAR_COLOR.light) : BAR_COLOR[theme]
    meta.content = color
  })

  // Kopie für den nächsten Start: index.html setzt die Darstellung damit schon
  // vor dem ersten Zeichnen (sonst blitzt kurz die falsche Farbe auf).
  // Nur eine Bequemlichkeit – die echten Einstellungen liegen in IndexedDB.
  try {
    localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify({ theme, fontScale: FONT_SCALE[settings.fontSize] ?? 1 }),
    )
  } catch {
    // privates Fenster o. Ä. – dann eben ohne
  }
}

/** Muss zum Skript in index.html passen */
const APPEARANCE_KEY = 'leenli-appearance'
