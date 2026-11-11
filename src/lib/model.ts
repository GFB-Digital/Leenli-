// Kleine Hilfsfunktionen rund um Kurse und Fortschritt (ohne Seiteneffekte)

import {
  isQuestion,
  type Course,
  type Lesson,
  type LessonResult,
  type Progress,
  type QuestionStep,
} from './types.ts'

export function lessonResult(
  progress: Progress,
  courseId: string,
  lessonId: string,
): LessonResult | undefined {
  return progress[courseId]?.[lessonId]
}

export function courseStats(course: Course, progress: Progress) {
  const done = course.lessons.filter((lesson) => lessonResult(progress, course.id, lesson.id)).length
  return { done, total: course.lessons.length }
}

/** Erste noch nicht erledigte Lektion */
export function nextLesson(course: Course, progress: Progress): Lesson | undefined {
  return course.lessons.find((lesson) => !lessonResult(progress, course.id, lesson.id))
}

export function lessonStats(lesson: Lesson) {
  const questions = lesson.steps.filter(isQuestion).length
  return { sections: lesson.steps.length - questions, questions }
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** Text in Absätze zerlegen (getrennt durch eine Leerzeile) */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

/** Zufällige Reihenfolge der Zahlen 0 … count-1 (Fisher-Yates) */
export function shuffledIndices(count: number, random: () => number = Math.random): number[] {
  const result = Array.from({ length: count }, (_, i) => i)
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ---------------------------------------------------------------------------
// Fragen einheitlich darstellen (Auswahl und Richtig/Falsch)

export interface Choice {
  /** Bei Auswahlfragen der Original-Index der Option, bei Richtig/Falsch 1 = stimmt, 0 = stimmt nicht */
  value: number
  label: string
}

export function questionChoices(step: QuestionStep, order: number[]): Choice[] {
  if (step.type === 'truefalse') {
    return [
      { value: 1, label: 'Stimmt' },
      { value: 0, label: 'Stimmt nicht' },
    ]
  }
  const indices = order.length === step.options.length ? order : step.options.map((_, i) => i)
  return indices.map((i) => ({ value: i, label: step.options[i] }))
}

export function correctValue(step: QuestionStep): number {
  if (step.type === 'truefalse') return step.answer ? 1 : 0
  return step.answer
}
