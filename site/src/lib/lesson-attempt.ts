export async function submitLessonAttempt(exerciseId: string, answer: number | number[]): Promise<boolean> {
  const match = location.pathname.match(/^\/(en|ru)\/learn\/([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/);
  if (!match) throw new Error("lesson_path_missing");
  const response = await fetch("/api/lessons/attempt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ path: match.slice(1), exerciseId, answer }),
  });
  if (!response.ok) throw new Error("attempt_failed");
  const result = await response.json() as { passed?: unknown };
  if (typeof result.passed !== "boolean") throw new Error("attempt_failed");
  return result.passed;
}
