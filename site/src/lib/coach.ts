import type { Locale } from "~/i18n";
import type { PracticeTaskData } from "~/content.config";
import { buildGradeContext, type PracticeCritique } from "~/scripts/practice-grade-llm";

export interface CoachStatus {
  authenticated: boolean;
  entitlements: { coach: boolean };
  billing: {
    configured: boolean;
    sponsorUrl: string | null;
    provider: "github-sponsors" | null;
    verification?: "verified" | "unavailable" | "reauth_required" | "not_checked";
  };
  managedAi: { available: boolean; limit: number; used: number; remaining: number; period: string; resetsAt: string };
}

export async function recheckCoachStatus(fetcher: typeof fetch = fetch): Promise<CoachStatus> {
  const r = await fetcher("/api/entitlements", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
  });
  if (!r.ok) throw new Error("coach_recheck_failed");
  return await r.json() as CoachStatus;
}

export async function fetchCoachStatus(fetcher: typeof fetch = fetch): Promise<CoachStatus> {
  const r = await fetcher("/api/entitlements", { credentials: "same-origin" });
  if (!r.ok) throw new Error("coach_status_failed");
  return await r.json() as CoachStatus;
}

export async function gradePracticeManaged(
  task: PracticeTaskData,
  lang: Locale,
  response: string,
  fetcher: typeof fetch = fetch,
): Promise<{ critique: PracticeCritique; usage: { used: number; limit: number; remaining: number; period: string } }> {
  const context = buildGradeContext(task, lang);
  const r = await fetcher("/api/coach/practice-grade", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lang, ...context, response }),
  });
  const body = await r.json().catch(() => ({})) as any;
  if (!r.ok) throw new Error(typeof body.error === "string" ? body.error : "coach_grade_failed");
  return body;
}
