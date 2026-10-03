import type { Env } from "./types";

export type LessonPath = { lang: "en" | "ru"; track: string; unit: string; lesson: string };
type Node = { type?: unknown; name?: unknown; props?: Record<string, unknown>; children?: Node[] };
export type LessonPayload = {
  lesson: { key: string; lang: "en" | "ru"; track: string; body: { format: string; root: Node[] } };
  graph: { navPrev: string | null; navNext?: string | null };
  [key: string]: unknown;
};
export type Exercise = { id: string; kind: "Quiz" | "DragOrder"; answer: number | number[] };

const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;
export function parseLessonPath(path: string | string[] | undefined): LessonPath | null {
  const parts = Array.isArray(path) ? path : String(path ?? "").split("/").filter(Boolean);
  if (parts.length !== 4) return null;
  const [lang, track, unit, lesson] = parts;
  if ((lang !== "en" && lang !== "ru") || ![track, unit, lesson].every((part) => typeof part === "string" && SEGMENT.test(part))) return null;
  return { lang, track, unit, lesson };
}

export async function loadLesson(env: Env, path: LessonPath): Promise<
  | { ok: true; payload: LessonPayload; version: string }
  | { ok: false; status: 404 | 502 | 503; code: string }
> {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;
  if (!base || !key) return { ok: false, status: 503, code: "lesson_backend_unconfigured" };
  try {
    const res = await fetch(`${base}/rest/v1/rpc/get_lesson_payload`, {
      method: "POST",
      headers: { "content-type": "application/json", "content-profile": "curriculum", apikey: key, authorization: `Bearer ${key}` },
      body: JSON.stringify({ lang_code: path.lang, track_code: path.track, unit_code: path.unit, lesson_slug: path.lesson }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { ok: false, status: 502, code: "lesson_backend_error" };
    const rows = await res.json() as Array<{ payload?: LessonPayload; version?: string }>;
    if (!Array.isArray(rows) || rows.length === 0) return { ok: false, status: 404, code: "lesson_not_found" };
    const row = rows[0];
    const expectedKey = `${path.track}/${path.unit}/${path.lesson}`;
    if (
      typeof row?.version !== "string" || !row.version ||
      row.payload?.lesson?.key !== expectedKey || row.payload.lesson.lang !== path.lang || row.payload.lesson.track !== path.track ||
      row.payload.lesson.body?.format !== "lesson-render-tree-v1" ||
      !Array.isArray(row.payload.lesson.body.root) ||
      !row.payload.graph || !Object.hasOwn(row.payload.graph, "navPrev") ||
      (row.payload.graph.navPrev !== null && typeof row.payload.graph.navPrev !== "string")
    ) return { ok: false, status: 502, code: "invalid_lesson_payload" };
    return { ok: true, payload: row.payload, version: row.version };
  } catch {
    return { ok: false, status: 502, code: "lesson_backend_unavailable" };
  }
}

export function requiredExercises(root: Node[]): Exercise[] {
  const found: Exercise[] = [];
  const seen = new Set<string>();
  function visit(nodes: Node[]) {
    for (const node of nodes) {
      if (node.type === "element" && (node.name === "Quiz" || node.name === "DragOrder")) {
        const id = node.props?.id;
        if (typeof id !== "string" || !id || seen.has(id)) throw new Error("invalid_lesson_exercise_id");
        seen.add(id);
        if (node.name === "Quiz") {
          const choices = node.props?.choices;
          if (!Array.isArray(choices)) throw new Error("invalid_lesson_quiz");
          const correct = choices.flatMap((choice, index) => choice && typeof choice === "object" && choice.correct === true ? [index] : []);
          if (correct.length !== 1) throw new Error("invalid_lesson_quiz");
          found.push({ id, kind: "Quiz", answer: correct[0] });
        } else {
          const items = node.props?.items;
          if (!Array.isArray(items) || items.length < 2) throw new Error("invalid_lesson_order");
          found.push({ id, kind: "DragOrder", answer: items.map((_, index) => index) });
        }
      }
      if (Array.isArray(node.children)) visit(node.children);
    }
  }
  visit(root);
  return found;
}

export function answerMatches(exercise: Exercise, answer: unknown): boolean {
  if (exercise.kind === "Quiz") return Number.isInteger(answer) && answer === exercise.answer;
  const expected = exercise.answer as number[];
  return Array.isArray(answer) && answer.length === expected.length &&
    answer.every((value, index) => Number.isInteger(value) && value === expected[index]);
}

export async function lessonAccessible(db: D1Database, userId: number | null, payload: LessonPayload, now = Date.now()): Promise<boolean> {
  const prev = payload.graph.navPrev;
  if (prev === null) return true;
  if (!userId || typeof prev !== "string" || !prev.startsWith(`${payload.lesson.track}/`) || prev === payload.lesson.key) return false;
  const grant = await db.prepare(
    "SELECT 1 AS allowed FROM course_access_grants WHERE user_id = ? AND track = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?) LIMIT 1",
  ).bind(userId, payload.lesson.track, now).first<{ allowed: number }>();
  if (grant?.allowed === 1) return true;
  const completed = await db.prepare(
    "SELECT 1 AS done FROM lesson_completions WHERE user_id = ? AND lesson_key = ?",
  ).bind(userId, prev).first<{ done: number }>();
  return completed?.done === 1;
}
