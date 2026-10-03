/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { getProduct } from "../../lib/products";
import { error, json } from "../../lib/response";

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "auth_required");
  const track = new URL(ctx.request.url).searchParams.get("track");
  if (!track || !getProduct(`course:${track}`)) return error(400, "invalid_track");
  const grant = await ctx.env.DB.prepare(
    "SELECT 1 AS unlocked FROM course_access_grants WHERE user_id = ? AND track = ? AND revoked_at IS NULL " +
    "AND (expires_at IS NULL OR expires_at > ?) LIMIT 1",
  ).bind(userId, track, Date.now()).first<{ unlocked: number }>();
  return json({ unlocked: grant?.unlocked === 1 }, 200, { "cache-control": "private, no-store" });
};
