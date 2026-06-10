/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { json, error } from "../lib/response";
import { parseFeedbackBody } from "../lib/metrics";

const MAX_BYTES = 8 * 1024;

/** Reader question for a lesson ("what was unclear"). Anonymous, rate-limited by middleware. */
export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const text = await ctx.request.text();
  if (new TextEncoder().encode(text).length > MAX_BYTES) return error(413, "too_large");
  const parsed = parseFeedbackBody(text);
  if (!parsed.ok) return error(400, parsed.code);

  await ctx.env.DB.prepare(
    "INSERT INTO feedback (ts, client_id, lesson, lang, text) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(Date.now(), parsed.clientId, parsed.lesson, parsed.lang, parsed.text)
    .run();
  return json({ ok: true });
};
