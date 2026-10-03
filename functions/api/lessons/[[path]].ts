/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { lessonAccessible, loadLesson, parseLessonPath, requiredExercises } from "../../lib/lesson-access";
import { error, json } from "../../lib/response";

export { parseLessonPath } from "../../lib/lesson-access";

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const path = parseLessonPath(ctx.params.path as string | string[] | undefined);
  if (!path) return error(400, "bad_lesson_path");

  const result = await loadLesson(ctx.env, path);
  if (!result.ok) return error(result.status, result.code);

  if (!(await lessonAccessible(ctx.env.DB, ctx.data.userId, result.payload))) {
    return error(ctx.data.userId ? 403 : 401, ctx.data.userId ? "lesson_locked" : "auth_required");
  }
  if (ctx.data.userId) {
    let required;
    try { required = requiredExercises(result.payload.lesson.body.root); }
    catch { return error(502, "invalid_lesson_exercises"); }
    if (required.length === 0) {
      await ctx.env.DB.prepare(
        "INSERT OR IGNORE INTO lesson_completions (user_id, lesson_key, completed_at) VALUES (?, ?, ?)",
      ).bind(ctx.data.userId, result.payload.lesson.key, Date.now()).run();
    }
  }
  return json(result.payload, 200, {
    "cache-control": "private, no-store",
    "x-skein-authenticated": ctx.data.userId ? "1" : "0",
  });
};
