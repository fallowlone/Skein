// Pure: turn parsed practice files into a per-lesson type-coverage map.

// The `practice-count` lint (src/lint/rules/practice.ts) fails the build when a
// lesson has fewer than 3 or more than 5 tasks. So 5 — not the Zod max of 8 — is
// the real ceiling: a lesson already at 5 has no room for an appended task.
export const MAX_TASKS_PER_LESSON = 5;

export interface PracticeFile {
  lessonKey: string;
  track: string;
  tasks: { type: string }[];
}

export interface LessonCoverage {
  lessonKey: string;
  track: string;
  types: Set<string>;
  taskCount: number;
  atCap: boolean;
}

export function typesByLesson(files: PracticeFile[]): Map<string, LessonCoverage> {
  const out = new Map<string, LessonCoverage>();
  for (const f of files) {
    out.set(f.lessonKey, {
      lessonKey: f.lessonKey,
      track: f.track,
      types: new Set(f.tasks.map((t) => t.type)),
      taskCount: f.tasks.length,
      atCap: f.tasks.length >= MAX_TASKS_PER_LESSON,
    });
  }
  return out;
}
