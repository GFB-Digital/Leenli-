import type { ReactNode } from 'react'

/** Untere Leiste einer Lektion – bleibt beim Scrollen sichtbar (gut mit dem Daumen erreichbar) */
export function LessonFooter({ children }: { children: ReactNode }) {
  return (
    <div className="lesson-footer">
      <div className="lesson-footer-inner">{children}</div>
    </div>
  )
}
