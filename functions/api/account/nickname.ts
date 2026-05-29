/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { setNickname, validateNickname, getUserById, termsCurrent } from "../../lib/db";
import { json, error } from "../../lib/response";

export const onRequestPatch: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  const u = await getUserById(ctx.env.DB, userId);
  if (!u || !termsCurrent(u, ctx.env)) {
    return error(403, "terms_required");
  }
  let body: { nickname?: string };
  try { body = await ctx.request.json(); } catch { return error(400, "bad_json"); }
  const v = validateNickname(body.nickname ?? "");
  if (!v.ok) return error(422, "invalid_nickname");
  await setNickname(ctx.env.DB, userId, v.value);
  return json({ ok: true, nickname: v.value });
};
