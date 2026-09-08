/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { getAiUsage } from "../lib/db";
import { COACH_AI_FEATURE, coachConfig, nextUtcMonthIso, resolveCoachAccess, utcMonthPeriod } from "../lib/coach";
import { json } from "../lib/response";

async function buildResponse(ctx: Parameters<PagesFunction<Env, any, RequestData>>[0], forceRefresh: boolean) {
  const cfg = coachConfig(ctx.env);
  const userId = ctx.data.userId;
  const period = utcMonthPeriod();
  const used = userId ? await getAiUsage(ctx.env.DB, userId, COACH_AI_FEATURE, period) : 0;
  const access = userId
    ? await resolveCoachAccess(ctx.env.DB, cfg, userId, ctx.data.githubAccessToken, forceRefresh)
    : null;
  return json({
    authenticated: Boolean(userId),
    entitlements: { coach: access?.coach ?? false },
    billing: {
      configured: cfg.billingConfigured,
      sponsorUrl: cfg.billingConfigured ? cfg.sponsorUrl : null,
      provider: cfg.billingConfigured ? "github-sponsors" : null,
      verification: cfg.billingConfigured ? (access?.state ?? "not_checked") : "not_checked",
      verifiedAt: access?.verifiedAt ? new Date(access.verifiedAt).toISOString() : null,
    },
    managedAi: {
      available: cfg.managedAiAvailable,
      limit: cfg.monthlyRequests,
      used,
      remaining: Math.max(0, cfg.monthlyRequests - used),
      period,
      resetsAt: nextUtcMonthIso(),
    },
  }, 200, { "Cache-Control": "no-store" });
}

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => buildResponse(ctx, false);

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const origin = ctx.request.headers.get("Origin");
  const referer = ctx.request.headers.get("Referer");
  const requestOrigin = new URL(ctx.request.url).origin;
  let sameOrigin = origin === requestOrigin;
  if (!sameOrigin && referer) {
    try { sameOrigin = new URL(referer).origin === requestOrigin; } catch { sameOrigin = false; }
  }
  if (!sameOrigin) return new Response(JSON.stringify({ error: "csrf" }), {
    status: 403,
    headers: { "content-type": "application/json", "Cache-Control": "no-store" },
  });
  return buildResponse(ctx, true);
};
