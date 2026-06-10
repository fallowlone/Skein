/// <reference types="@cloudflare/workers-types" />

/**
 * Validation for the anonymous metrics pipeline. Pure functions so they are
 * unit-testable without a D1 fake; the api/ handlers do only I/O.
 */

export type MetricEvent =
  | { type: "lesson_view"; lesson: string; track?: string; lang?: string }
  | { type: "lesson_time"; lesson: string; seconds: number }
  | {
      type: "practice_result";
      lesson: string;
      taskId: string;
      taskType: string;
      correct: boolean;
    };

export const MAX_EVENTS_PER_BATCH = 20;
export const MAX_BODY_BYTES = 16 * 1024;
/** Idle-tab guard: a single lesson_time report can't claim more than an hour. */
export const MAX_SECONDS = 60 * 60;
export const MAX_QUESTION_CHARS = 2000;

const SLUG_RE = /^[a-z0-9/_-]{1,200}$/;
const ID_RE = /^[A-Za-z0-9_.:-]{1,100}$/;
const CLIENT_RE = /^[A-Za-z0-9-]{8,64}$/;
const LANG_RE = /^(en|ru)$/;

export interface ParsedBatch {
  ok: true;
  clientId: string;
  events: MetricEvent[];
}
export interface ParseFail {
  ok: false;
  code: "bad_json" | "bad_shape" | "too_many" | "bad_event";
}

export function parseEventsBody(text: string): ParsedBatch | ParseFail {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, code: "bad_json" };
  }
  if (typeof body !== "object" || body === null) return { ok: false, code: "bad_shape" };
  const { clientId, events } = body as { clientId?: unknown; events?: unknown };
  if (typeof clientId !== "string" || !CLIENT_RE.test(clientId)) {
    return { ok: false, code: "bad_shape" };
  }
  if (!Array.isArray(events) || events.length === 0) return { ok: false, code: "bad_shape" };
  if (events.length > MAX_EVENTS_PER_BATCH) return { ok: false, code: "too_many" };

  const out: MetricEvent[] = [];
  for (const raw of events) {
    const e = validateEvent(raw);
    if (!e) return { ok: false, code: "bad_event" };
    out.push(e);
  }
  return { ok: true, clientId, events: out };
}

function validateEvent(raw: unknown): MetricEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.lesson !== "string" || !SLUG_RE.test(r.lesson)) return null;

  switch (r.type) {
    case "lesson_view": {
      if (r.track !== undefined && (typeof r.track !== "string" || !SLUG_RE.test(r.track))) return null;
      if (r.lang !== undefined && (typeof r.lang !== "string" || !LANG_RE.test(r.lang))) return null;
      return { type: "lesson_view", lesson: r.lesson, track: r.track as string | undefined, lang: r.lang as string | undefined };
    }
    case "lesson_time": {
      if (typeof r.seconds !== "number" || !Number.isFinite(r.seconds) || r.seconds <= 0) return null;
      return { type: "lesson_time", lesson: r.lesson, seconds: Math.min(Math.round(r.seconds), MAX_SECONDS) };
    }
    case "practice_result": {
      if (typeof r.taskId !== "string" || !ID_RE.test(r.taskId)) return null;
      if (typeof r.taskType !== "string" || !ID_RE.test(r.taskType)) return null;
      if (typeof r.correct !== "boolean") return null;
      return { type: "practice_result", lesson: r.lesson, taskId: r.taskId, taskType: r.taskType, correct: r.correct };
    }
    default:
      return null;
  }
}

export interface ParsedFeedback {
  ok: true;
  clientId: string;
  lesson: string;
  lang: string | null;
  text: string;
}

export function parseFeedbackBody(text: string): ParsedFeedback | ParseFail {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, code: "bad_json" };
  }
  if (typeof body !== "object" || body === null) return { ok: false, code: "bad_shape" };
  const r = body as Record<string, unknown>;
  if (typeof r.clientId !== "string" || !CLIENT_RE.test(r.clientId)) return { ok: false, code: "bad_shape" };
  if (typeof r.lesson !== "string" || !SLUG_RE.test(r.lesson)) return { ok: false, code: "bad_shape" };
  const lang = typeof r.lang === "string" && LANG_RE.test(r.lang) ? r.lang : null;
  const q = typeof r.text === "string" ? r.text.trim() : "";
  if (q.length === 0 || q.length > MAX_QUESTION_CHARS) return { ok: false, code: "bad_shape" };
  return { ok: true, clientId: r.clientId, lesson: r.lesson, lang, text: q };
}

/** Constant-time string compare (both UTF-8 encoded) for the admin token. */
export function tokensEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}
