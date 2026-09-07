import { describe, expect, it } from "vitest";
import { onRequestGet } from "./entitlements";
import { reserveAiUse, setEntitlement, upsertUserFromGithub } from "../lib/db";
import { utcMonthPeriod } from "../lib/coach";
import { FakeD1 } from "../test/fakes";

function env(db: FakeD1, overrides: Record<string, unknown> = {}) {
  return {
    DB: db,
    GITHUB_SPONSORS_URL: "https://github.com/sponsors/skein-owner",
    GITHUB_SPONSORS_WEBHOOK_SECRET: "secret",
    GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH",
    ANTHROPIC_API_KEY: "sk-server",
    COACH_AI_MONTHLY_REQUESTS: "30",
    ...overrides,
  } as any;
}

describe("Coach entitlement status", () => {
  it("reports configured billing without inventing an entitlement for signed-out users", async () => {
    const db = new FakeD1();
    const r = await onRequestGet({ env: env(db), data: { userId: null } } as any);
    expect(r.status).toBe(200);
    await expect(r.json()).resolves.toMatchObject({
      authenticated: false,
      entitlements: { coach: false },
      billing: {
        configured: true,
        sponsorUrl: "https://github.com/sponsors/skein-owner",
        provider: "github-sponsors",
      },
      managedAi: { available: true, limit: 30, used: 0, remaining: 30 },
    });
  });

  it("returns the authoritative entitlement and atomic monthly usage", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    await setEntitlement(db as any, user.id, "coach", true, "github-sponsors", "S_1", 1);
    const period = utcMonthPeriod();
    await reserveAiUse(db as any, user.id, "practice-grade", period, 30, 2);
    await reserveAiUse(db as any, user.id, "practice-grade", period, 30, 3);

    const r = await onRequestGet({ env: env(db), data: { userId: user.id } } as any);
    await expect(r.json()).resolves.toMatchObject({
      authenticated: true,
      entitlements: { coach: true },
      managedAi: { available: true, limit: 30, used: 2, remaining: 28, period },
    });
  });

  it("suppresses checkout metadata when billing is incomplete", async () => {
    const db = new FakeD1();
    const r = await onRequestGet({
      env: env(db, { GITHUB_SPONSORS_WEBHOOK_SECRET: "", ANTHROPIC_API_KEY: "" }),
      data: { userId: null },
    } as any);
    await expect(r.json()).resolves.toMatchObject({
      billing: { configured: false, sponsorUrl: null, provider: null },
      managedAi: { available: false },
    });
  });
});
