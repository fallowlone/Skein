/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { json, error } from "../lib/response";
import { rateLimit } from "../lib/ratelimit";

const MIN_Q = 2;
const MAX_Q = 128;
const MAX_RESULTS = 20;
const RATE_LIMIT = 30;      // requests per IP per window
const RATE_WINDOW = 60;     // seconds
const LOCALES = new Set(["en", "ru"]);

export interface SearchHit {
  slug: string; track: string; unit: string;
  title: string; href: string; snippet: string;
}

export type Validation =
  | { ok: true; q: string; lang: string }
  | { ok: false; reason: string };

/** Reject bad input before it can reach the database. */
export function validateSearchParams(q: string | null, lang: string | null): Validation {
  const trimmed = (q ?? "").trim();
  if (trimmed.length < MIN_Q) return { ok: false, reason: "q_too_short" };
  if (trimmed.length > MAX_Q) return { ok: false, reason: "q_too_long" };
  if (!lang || !LOCALES.has(lang)) return { ok: false, reason: "bad_lang" };
  return { ok: true, q: trimmed, lang };
}

interface Row {
  slug: string; track: string; unit: string;
  title: string; summary: string; snippet: string; rank: number;
}

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const v = validateSearchParams(url.searchParams.get("q"), url.searchParams.get("lang"));
  if (!v.ok) return error(400, v.reason);

  const ip = ctx.request.headers.get("CF-Connecting-IP") ?? "unknown";
  const rl = await rateLimit({
    kv: ctx.env.SESSIONS, ip, bucket: "search",
    limit: RATE_LIMIT, windowSec: RATE_WINDOW,
  });
  if (!rl.ok) return error(429, "rate_limited");

  // Unconfigured mirror is not an error: local search still works, and a
  // preview deployment without secrets should serve a working page.
  const base = ctx.env.SUPABASE_URL;
  const key = ctx.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return json({ results: [] });

  let rows: Row[] = [];
  try {
    const res = await fetch(`${base}/rest/v1/rpc/search_lessons`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-profile": "curriculum",   // selects the schema for RPC POSTs
        apikey: key,
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ q: v.q, lang_code: v.lang, max_results: MAX_RESULTS }),
    });
    if (!res.ok) return json({ results: [] });   // degrade, never break
    rows = (await res.json()) as Row[];
  } catch {
    return json({ results: [] });
  }

  const results: SearchHit[] = (rows ?? []).map((r) => ({
    slug: r.slug, track: r.track, unit: r.unit, title: r.title,
    href: `/${v.lang}/learn/${r.track}/${r.unit}/${r.slug}/`,
    snippet: r.snippet ?? "",
  }));

  return json({ results }, 200, { "cache-control": "public, max-age=300" });
};
