export type TaskStatus = "seen" | "attempted" | "done";

const keyFor = (lessonKey: string) => `atlas.practice.${lessonKey}`;

export function readProgress(lessonKey: string): Record<string, TaskStatus> {
  try {
    const raw = localStorage.getItem(keyFor(lessonKey));
    return raw ? (JSON.parse(raw) as Record<string, TaskStatus>) : {};
  } catch {
    return {};
  }
}

export function setTaskStatus(lessonKey: string, taskId: string, status: TaskStatus): void {
  try {
    const cur = readProgress(lessonKey);
    cur[taskId] = status;
    localStorage.setItem(keyFor(lessonKey), JSON.stringify(cur));
  } catch {
    /* private browsing, storage full — non-fatal */
  }
}
