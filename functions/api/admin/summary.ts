/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { json, error } from "../../lib/response";
import { int, invalid } from "../../lib/validate";
import { tokensEqual } from "../../lib/metrics";
import { rateLimit } from "../../lib/ratelimit";

const MAX_PER_PAGE = 100;
const MAX_QUESTIONS = 100;

interface ViewRow { lesson: string; track: string | null; views: number; uniq: number; }
interface TimeRow { lesson: string; avg_seconds: number; samples: number; }
interface PracticeRow { lesson: string; attempts: number; correct_ratio: number; }
interface FeedbackRow { id: number; ts: number; lesson: string; lang: string | null; text: string; }

/**
 * Owner-only aggregate view. Gated by the ADMIN_TOKEN secret (Bearer header);
 * not wired to GitHub auth on purpose — one operator, one token.
 */
export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const ip = ctx.request.headers.get("CF-Connecting-IP") ?? "unknown";
  const rl = await rateLimit({ kv: ctx.env.SESSIONS, ip, bucket: "admin", limit: 30, windowSec: 60 });
  if (!rl.ok) return error(429, "rate_limited");
  const token = ctx.env.ADMIN_TOKEN;
  if (!token) return error(503, "admin_disabled");
  const auth = ctx.request.headers.get("Authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!provided || !tokensEqual(provided, token)) return error(401, "unauthorized");

  const params = new URL(ctx.request.url).searchParams;
  const page = int(params.get("page"), { min: 1, max: 1_000_000, code: "bad_page", fallback: 1 });
  if (!page.ok) return invalid(page.code);
  const perPage = int(params.get("per_page"), { min: 1, max: MAX_PER_PAGE, code: "bad_per_page", fallback: 50 });
  if (!perPage.ok) return invalid(perPage.code);
  const questionsLimit = int(params.get("questions_limit"), { min: 1, max: MAX_QUESTIONS, code: "bad_questions_limit", fallback: 20 });
  if (!questionsLimit.ok) return invalid(questionsLimit.code);
  const sinceRaw = params.get("since");
  const since = sinceRaw === null
    ? { ok: true as const, value: null as number | null }
    : int(sinceRaw, { min: 0, max: 8_640_000_000_000_000, code: "bad_since" });
  if (!since.ok) return invalid(since.code);

  const db = ctx.env.DB;
  // Optional lower time bound so the operator can cap the aggregate scan
  // (backed by idx_events_type_ts from migration 0010); absent = all time.
  const timeFilter = since.value === null ? "" : " AND ts >= ?";
  const timeArgs = since.value === null ? [] : [since.value];
  const aggregate = <T>(sql: string) => {
    const stmt = db.prepare(sql + timeFilter);
    return (timeArgs.length > 0 ? stmt.bind(...timeArgs) : stmt).all<T>();
  };
  const [views, times, practice, feedback] = await Promise.all([
    aggregate<ViewRow>(
      "SELECT lesson, track, COUNT(*) AS views, COUNT(DISTINCT client_id) AS uniq " +
      "FROM events WHERE type = 'lesson_view' GROUP BY lesson, track",
    ),
    aggregate<TimeRow>(
      "SELECT lesson, AVG(seconds) AS avg_seconds, COUNT(*) AS samples " +
      "FROM events WHERE type = 'lesson_time' GROUP BY lesson",
    ),
    aggregate<PracticeRow>(
      "SELECT lesson, COUNT(*) AS attempts, AVG(correct) AS correct_ratio " +
      "FROM events WHERE type = 'practice_result' GROUP BY lesson",
    ),
    db.prepare(
      "SELECT id, ts, lesson, lang, text FROM feedback ORDER BY ts DESC LIMIT ?",
    ).bind(questionsLimit.value).all<FeedbackRow>(),
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

  const all = [...byLesson.values()].sort((a, b) => b.views - a.views);
  const start = (page.value - 1) * perPage.value;
  const lessons = all.slice(start, start + perPage.value);
  return json({
    lessons,
    page: page.value,
    per_page: perPage.value,
    totalLessons: all.length,
    questions: feedback.results,
  });
};
