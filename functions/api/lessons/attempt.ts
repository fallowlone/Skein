/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { getUserById, termsCurrent } from "../../lib/db";
import { readBodyBounded } from "../../lib/coach";
import { answerMatches, lessonAccessible, loadLesson, parseLessonPath, requiredExercises } from "../../lib/lesson-access";
import { error, isSameOriginMutation, json } from "../../lib/response";

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "auth_required");
  if (!isSameOriginMutation(ctx.request)) return error(403, "csrf");
  const user = await getUserById(ctx.env.DB, userId);
  if (!user || !termsCurrent(user, ctx.env)) return error(403, "terms_required");

  const raw = await readBodyBounded(ctx.request, 4 * 1024);
  if (!raw || raw.byteLength === 0) return error(400, "bad_json");
  let body: any;
  try { body = JSON.parse(new TextDecoder().decode(raw)); }
  catch { return error(400, "bad_json"); }
  const path = parseLessonPath(body?.path);
  const exerciseId = body?.exerciseId;
  if (!path || typeof exerciseId !== "string" || !exerciseId || exerciseId.length > 128) {
    return error(400, "bad_attempt");
  }

  const result = await loadLesson(ctx.env, path);
  if (!result.ok) return error(result.status, result.code);
  if (!(await lessonAccessible(ctx.env.DB, userId, result.payload))) return error(403, "lesson_locked");

  let required;
  try { required = requiredExercises(result.payload.lesson.body.root); }
  catch { return error(502, "invalid_lesson_exercises"); }
  const exercise = required.find((item) => item.id === exerciseId);
  if (!exercise) return error(400, "unknown_exercise");
  if (!answerMatches(exercise, body.answer)) return json({ passed: false, lessonCompleted: false }, 200, { "cache-control": "no-store" });

  const key = result.payload.lesson.key;
  const now = Date.now();
  const requiredIds = required.map((item) => item.id);
  const placeholders = requiredIds.map(() => "?").join(", ");
  await ctx.env.DB.batch([
    ctx.env.DB.prepare(
      "INSERT OR IGNORE INTO lesson_exercise_passes (user_id, lesson_key, exercise_id, passed_at) VALUES (?, ?, ?, ?)",
    ).bind(userId, key, exerciseId, now),
    ctx.env.DB.prepare(
      "INSERT OR IGNORE INTO lesson_completions (user_id, lesson_key, completed_at) " +
      `SELECT ?, ?, ? WHERE (SELECT COUNT(*) FROM lesson_exercise_passes WHERE user_id = ? AND lesson_key = ? AND exercise_id IN (${placeholders})) = ?`,
    ).bind(userId, key, now, userId, key, ...requiredIds, requiredIds.length),
  ]);
  const complete = await ctx.env.DB.prepare(
    "SELECT 1 AS done FROM lesson_completions WHERE user_id = ? AND lesson_key = ?",
  ).bind(userId, key).first<{ done: number }>();
  return json({ passed: true, lessonCompleted: complete?.done === 1 }, 200, { "cache-control": "no-store" });
};
