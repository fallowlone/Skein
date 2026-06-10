/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { json, error } from "../../lib/response";
import { tokensEqual } from "../../lib/metrics";

interface ViewRow { lesson: string; track: string | null; views: number; uniq: number; }
interface TimeRow { lesson: string; avg_seconds: number; samples: number; }
interface PracticeRow { lesson: string; attempts: number; correct_ratio: number; }
interface FeedbackRow { id: number; ts: number; lesson: string; lang: string | null; text: string; }

/**
 * Owner-only aggregate view. Gated by the ADMIN_TOKEN secret (Bearer header);
 * not wired to GitHub auth on purpose — one operator, one token.
 */
export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const token = ctx.env.ADMIN_TOKEN;
  if (!token) return error(503, "admin_disabled");
  const auth = ctx.request.headers.get("Authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!provided || !tokensEqual(provided, token)) return error(401, "unauthorized");

  const db = ctx.env.DB;
  const [views, times, practice, feedback] = await Promise.all([
    db.prepare(
      "SELECT lesson, track, COUNT(*) AS views, COUNT(DISTINCT client_id) AS uniq " +
      "FROM events WHERE type = 'lesson_view' GROUP BY lesson, track",
    ).all<ViewRow>(),
    db.prepare(
      "SELECT lesson, AVG(seconds) AS avg_seconds, COUNT(*) AS samples " +
      "FROM events WHERE type = 'lesson_time' GROUP BY lesson",
    ).all<TimeRow>(),
    db.prepare(
      "SELECT lesson, COUNT(*) AS attempts, AVG(correct) AS correct_ratio " +
      "FROM events WHERE type = 'practice_result' GROUP BY lesson",
    ).all<PracticeRow>(),
    db.prepare(
      "SELECT id, ts, lesson, lang, text FROM feedback ORDER BY ts DESC LIMIT 100",
    ).all<FeedbackRow>(),
  ]);

  const byLesson = new Map<string, {
    lesson: string; track: string | null;
    views: number; uniqueClients: number;
    avgSeconds: number | null; timeSamples: number;
    attempts: number; correctRatio: number | null;
  }>();
  const entry = (lesson: string) => {
    let e = byLesson.get(lesson);
    if (!e) {
      e = { lesson, track: null, views: 0, uniqueClients: 0, avgSeconds: null, timeSamples: 0, attempts: 0, correctRatio: null };
      byLesson.set(lesson, e);
    }
    return e;
  };
  for (const r of views.results) {
    const e = entry(r.lesson);
    e.track = r.track ?? e.track;
    e.views += r.views;
    e.uniqueClients += r.uniq;
  }
  for (const r of times.results) {
    const e = entry(r.lesson);
    e.avgSeconds = Math.round(r.avg_seconds);
    e.timeSamples = r.samples;
  }
  for (const r of practice.results) {
    const e = entry(r.lesson);
    e.attempts = r.attempts;
    e.correctRatio = Math.round(r.correct_ratio * 1000) / 1000;
  }

  const lessons = [...byLesson.values()].sort((a, b) => b.views - a.views);
  return json({ lessons, questions: feedback.results });
};
