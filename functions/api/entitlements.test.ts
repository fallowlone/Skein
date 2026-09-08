import { describe, expect, it, vi, afterEach } from "vitest";
import { onRequestGet, onRequestPost } from "./entitlements";
import { reserveAiUse, setEntitlement, upsertUserFromGithub } from "../lib/db";
import { utcMonthPeriod } from "../lib/coach";
import { FakeD1 } from "../test/fakes";

afterEach(() => vi.restoreAllMocks());

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
    expect(r.headers.get("Cache-Control")).toBe("no-store");
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
    await setEntitlement(db as any, user.id, "coach", true, "github-sponsors", "S_1", 1, Date.now());
    const period = utcMonthPeriod();
    await reserveAiUse(db as any, user.id, "practice-grade", period, 30, 2);
    await reserveAiUse(db as any, user.id, "practice-grade", period, 30, 3);

    const r = await onRequestGet({ env: env(db), data: { userId: user.id, githubAccessToken: "token" } } as any);
    await expect(r.json()).resolves.toMatchObject({
      authenticated: true,
      entitlements: { coach: true },
      managedAi: { available: true, limit: 30, used: 2, remaining: 28, period },
    });
  });

  it("force rechecks through the same endpoint", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const r = await onRequestPost({
      request: new Request("https://skein.test/api/entitlements", { headers: { Origin: "https://skein.test" } }),
      env: env(db), data: { userId: user.id, githubAccessToken: "token" },
    } as any);
    expect(r.status).toBe(200);
    expect((await r.json() as any).billing.verification).toBe("unavailable");
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });

  it("does not cache a rejected cross-origin manual recheck", async () => {
    const r = await onRequestPost({
      request: new Request("https://skein.test/api/entitlements", { headers: { Origin: "https://evil.test" } }),
      env: env(new FakeD1()), data: { userId: null },
    } as any);
    expect(r.status).toBe(403);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });

  it("keeps a fresh inactive result cached without querying GitHub", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    await setEntitlement(db as any, user.id, "coach", false, "github-sponsors", null, Date.now(), Date.now());
    const provider = vi.spyOn(globalThis, "fetch");
    const r = await onRequestGet({ env: env(db), data: { userId: user.id, githubAccessToken: "token" } } as any);
    expect(r.status).toBe(200);
    expect((await r.json() as any).billing.verification).toBe("verified");
    expect(provider).not.toHaveBeenCalled();
  });

  it("does not grant stale active state when GitHub is unavailable", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    await setEntitlement(db as any, user.id, "coach", true, "github-sponsors", "S_1", 1, Date.now() - 6 * 60 * 1000);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const body = await (await onRequestGet({ env: env(db), data: { userId: user.id, githubAccessToken: "token" } } as any)).json() as any;
    expect(body.entitlements.coach).toBe(false);
    expect(body.billing.verification).toBe("unavailable");
  });

  it("maps a revoked OAuth token to reauth_required and never Coach", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    await setEntitlement(db as any, user.id, "coach", true, "github-sponsors", "S_1", 1, Date.now() - 6 * 60 * 1000);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const body = await (await onRequestGet({ env: env(db), data: { userId: user.id, githubAccessToken: "revoked-token" } } as any)).json() as any;
    expect(body.entitlements.coach).toBe(false);
    expect(body.billing.verification).toBe("reauth_required");
  });

  it("reports reauth_required for an authenticated old session without a token", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    const body = await (await onRequestGet({ env: env(db), data: { userId: user.id } } as any)).json() as any;
    expect(body.entitlements.coach).toBe(false);
    expect(body.billing.verification).toBe("reauth_required");
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
