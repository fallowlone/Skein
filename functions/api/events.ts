/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { json, error } from "../lib/response";
import { parseEventsBody, MAX_BODY_BYTES } from "../lib/metrics";

/**
 * Anonymous metrics ingest. Fire-and-forget from the client (sendBeacon),
 * so responses are best-effort; the client never reads them.
 */
export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const text = await ctx.request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return error(413, "too_large");
  const parsed = parseEventsBody(text);
  if (!parsed.ok) return error(400, parsed.code);

  const now = Date.now();
  const stmt = ctx.env.DB.prepare(
    "INSERT INTO events (client_id, ts, type, lesson, track, lang, task_id, task_type, correct, seconds) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  await ctx.env.DB.batch(
    parsed.events.map((e) =>
      stmt.bind(
        parsed.clientId,
        now,
        e.type,
        e.lesson,
        e.type === "lesson_view" ? e.track ?? null : null,
        e.type === "lesson_view" ? e.lang ?? null : null,
        e.type === "practice_result" ? e.taskId : null,
        e.type === "practice_result" ? e.taskType : null,
        e.type === "practice_result" ? (e.correct ? 1 : 0) : null,
        e.type === "lesson_time" ? e.seconds : null,
      ),
    ),
  );
  return json({ ok: true });
};
