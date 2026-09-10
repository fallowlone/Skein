/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { error, json } from "../../lib/response";

const LOCALES = new Set(["en", "ru"]);
const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;
const CACHE_CONTROL = "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";

type LessonPath = { lang: string; track: string; unit: string; lesson: string };

export function parseLessonPath(path: string | string[] | undefined): LessonPath | null {
  const parts = Array.isArray(path) ? path : String(path ?? "").split("/").filter(Boolean);
  if (parts.length !== 4) return null;
  const [lang, track, unit, lesson] = parts;
  if (!LOCALES.has(lang) || ![track, unit, lesson].every((part) => SEGMENT.test(part))) return null;
  return { lang, track, unit, lesson };
}

function etag(version: string): string {
  return `"${version}"`;
}

function matchesEtag(header: string | null, tag: string): boolean {
  if (!header) return false;
  return header.split(",").some((value) => value.trim().replace(/^W\//, "") === tag);
}

interface RpcRow {
  payload: unknown;
  version: string;
}

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const path = parseLessonPath(ctx.params.path as string | string[] | undefined);
  if (!path) return error(400, "bad_lesson_path");

  const base = ctx.env.SUPABASE_URL;
  const key = ctx.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return error(503, "lesson_backend_unconfigured");

  let rows: RpcRow[];
  try {
    const res = await fetch(`${base}/rest/v1/rpc/get_lesson_payload`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-profile": "curriculum",
        apikey: key,
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        lang_code: path.lang,
        track_code: path.track,
        unit_code: path.unit,
        lesson_slug: path.lesson,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return error(502, "lesson_backend_error");
    const body = await res.json();
    rows = Array.isArray(body) ? body as RpcRow[] : [];
  } catch {
    return error(502, "lesson_backend_unavailable");
  }

  const row = rows[0];
  if (!row?.payload || typeof row.version !== "string" || !row.version) {
    return rows.length === 0 ? error(404, "lesson_not_found") : error(502, "invalid_lesson_payload");
  }

  const tag = etag(row.version);
  const headers = { etag: tag, "cache-control": CACHE_CONTROL };
  if (matchesEtag(ctx.request.headers.get("if-none-match"), tag)) {
    return new Response(null, { status: 304, headers });
  }
  return json(row.payload, 200, headers);
};
