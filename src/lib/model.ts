// Kleine Hilfsfunktionen rund um Kurse und Fortschritt (ohne Seiteneffekte)

import { isQuestion, type Course, type Lesson, type LessonResult, type Progress } from './types.ts'

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
