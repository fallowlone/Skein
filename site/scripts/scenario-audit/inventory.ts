// Pure: turn parsed practice files into a per-lesson type-coverage map.
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
      atCap: f.tasks.length >= 8,
    });
  }
  return out;
}
