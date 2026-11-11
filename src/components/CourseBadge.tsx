import type { Course } from '../lib/types.ts'

/** Emoji des Kurses – oder, falls keins angegeben ist, der Anfangsbuchstabe */
export function CourseBadge({ course, large = false }: { course: Course; large?: boolean }) {
  const emoji = course.emoji?.trim()
  const className = ['badge', large && 'badge--large', !emoji && 'badge--letter']
    .filter(Boolean)
    .join(' ')
  return (
    <span className={className} aria-hidden="true">
      {emoji || Array.from(course.title.trim())[0]?.toUpperCase() || '?'}
    </span>
  )
}
