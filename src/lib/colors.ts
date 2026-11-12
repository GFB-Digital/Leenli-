// Farben für Kurse (Karte, Fragekarten, Wissensbank).
// Kräftig genug für weiße Schrift, funktionieren hell und dunkel.

export const COURSE_COLORS = {
  indigo: '#5b4fd6',
  violett: '#8e4fc6',
  blau: '#2f6fd0',
  tuerkis: '#1d8796',
  gruen: '#2e8a55',
  oliv: '#76862a',
  gold: '#b07d12',
  orange: '#cc5f1f',
  rost: '#a4502c',
  rosa: '#c0467a',
  schiefer: '#56687c',
} as const

export type CourseColorName = keyof typeof COURSE_COLORS

export const COURSE_COLOR_NAMES = Object.keys(COURSE_COLORS) as CourseColorName[]

export function isCourseColor(name: string): name is CourseColorName {
  return name in COURSE_COLORS
}

/** Farbe eines Kurses: angegeben oder stabil aus der ID abgeleitet */
export function courseColor(course: { id: string; color?: string }): string {
  if (course.color && isCourseColor(course.color)) return COURSE_COLORS[course.color]
  let hash = 0
  for (const char of course.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return COURSE_COLORS[COURSE_COLOR_NAMES[hash % COURSE_COLOR_NAMES.length]]
}
