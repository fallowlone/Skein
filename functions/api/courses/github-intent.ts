/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { getUserById, termsCurrent } from "../../lib/db";
import { readBodyBounded, normalizeGithubSponsorsUrl } from "../../lib/coach";
import { getProduct } from "../../lib/products";
import { error, isSameOriginMutation, json } from "../../lib/response";

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "auth_required");
  if (!isSameOriginMutation(ctx.request)) return error(403, "csrf");
  const sponsor = normalizeGithubSponsorsUrl(ctx.env.GITHUB_SPONSORS_URL);
  if (!sponsor || !ctx.env.GITHUB_SPONSORS_WEBHOOK_SECRET || !ctx.env.GITHUB_SPONSORS_COURSE_TIER_ID) {
    return error(503, "billing_unavailable");
  }
  const user = await getUserById(ctx.env.DB, userId);
  if (!user || !termsCurrent(user, ctx.env)) return error(403, "terms_required");
  const raw = await readBodyBounded(ctx.request, 1024);
  let track: unknown;
  try { track = JSON.parse(new TextDecoder().decode(raw ?? new Uint8Array())).track; }
  catch { return error(400, "bad_json"); }
  if (typeof track !== "string" || !getProduct(`course:${track}`)) return error(400, "invalid_track");

  const owned = await ctx.env.DB.prepare(
    "SELECT 1 AS owned FROM course_access_grants WHERE user_id = ? AND track = ? AND revoked_at IS NULL LIMIT 1",
  ).bind(userId, track).first<{ owned: number }>();
  if (owned) return error(409, "course_already_unlocked");
  const now = Date.now();
  const result = await ctx.env.DB.prepare(
    "INSERT INTO course_purchase_intents (user_id, track, expires_at, consumed_at) VALUES (?, ?, ?, NULL) " +
    "ON CONFLICT(user_id) DO UPDATE SET track = excluded.track, expires_at = excluded.expires_at, consumed_at = NULL " +
    "WHERE course_purchase_intents.expires_at <= ? OR course_purchase_intents.consumed_at IS NOT NULL " +
    "OR course_purchase_intents.track = excluded.track",
  ).bind(userId, track, now + 60 * 60 * 1000, now).run();
  if ((result.meta?.changes ?? 0) !== 1) return error(409, "checkout_already_pending");
  return json({ sponsorUrl: sponsor.url, track, priceUsd: "9.99" }, 200, { "cache-control": "no-store" });
};
