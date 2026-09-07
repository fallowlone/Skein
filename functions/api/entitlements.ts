/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { getAiUsage, getEntitlement } from "../lib/db";
import { COACH_AI_FEATURE, COACH_ENTITLEMENT, coachConfig, nextUtcMonthIso, utcMonthPeriod } from "../lib/coach";
import { json } from "../lib/response";

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const cfg = coachConfig(ctx.env);
  const userId = ctx.data.userId;
  const period = utcMonthPeriod();
  const used = userId ? await getAiUsage(ctx.env.DB, userId, COACH_AI_FEATURE, period) : 0;
  const coach = userId ? await getEntitlement(ctx.env.DB, userId, COACH_ENTITLEMENT) : false;
  return json({
    authenticated: Boolean(userId),
    entitlements: { coach },
    billing: {
      configured: cfg.billingConfigured,
      sponsorUrl: cfg.billingConfigured ? cfg.sponsorUrl : null,
      provider: cfg.billingConfigured ? "github-sponsors" : null,
    },
    managedAi: {
      available: cfg.managedAiAvailable,
      limit: cfg.monthlyRequests,
      used,
      remaining: Math.max(0, cfg.monthlyRequests - used),
      period,
      resetsAt: nextUtcMonthIso(),
    },
  });
};

