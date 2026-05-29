/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { getProgress, putProgress, getUserById, termsCurrent } from "../lib/db";
import { json, error } from "../lib/response";

const MAX_BYTES = 256 * 1024; // 256 KB ceiling on a progress blob (measured in UTF-8 bytes)

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  const data = await getProgress(ctx.env.DB, userId);
  return json({ data: data ? JSON.parse(data) : null });
};

export const onRequestPut: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  const u = await getUserById(ctx.env.DB, userId);
  if (!u || !termsCurrent(u, ctx.env)) {
    return error(403, "terms_required");
  }
  const text = await ctx.request.text();
  // Cap on actual UTF-8 byte size, not UTF-16 code-unit count, so multi-byte
  // payloads can't slip past the ceiling.
  if (new TextEncoder().encode(text).length > MAX_BYTES) return error(413, "too_large");
  try { JSON.parse(text); } catch { return error(400, "bad_json"); }
  await putProgress(ctx.env.DB, userId, text, Date.now());
  return json({ ok: true });
};
