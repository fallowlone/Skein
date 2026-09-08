import { describe, expect, it } from "vitest";
import {
  coachConfig,
  coachTierQualifies,
  normalizeGithubSponsorsUrl,
  reconcileGithubSponsorOnLogin,
  reconcileVerifiedGithubSponsorOnLogin,
  verifyGithubWebhookSignature,
} from "./coach";
import { getEntitlement, getGithubSponsorshipUserId, revokeEntitlementIfSource, setEntitlement, upsertGithubSponsorship, upsertUserFromGithub } from "./db";
import { FakeD1 } from "../test/fakes";

function cancellationAfterRead(db: FakeD1, readKind: "by-sponsor" | "by-id", sponsorshipId: string, userId: number) {
  let cancelled = false;
  return {
    prepare(sql: string) {
      const inner = db.prepare(sql);
      const intercepted = readKind === "by-sponsor"
        ? sql.startsWith("SELECT sponsorship_id") && sql.includes("WHERE github_sponsor_id")
        : sql.startsWith("SELECT sponsorship_id") && sql.includes("WHERE sponsorship_id");
      return {
        bind(...args: unknown[]) {
          const bound = inner.bind(...args);
          return {
            async first<T>() {
              const result = await bound.first<T>();
              if (intercepted && !cancelled) {
                cancelled = true;
                await upsertGithubSponsorship(db as any, {
                  sponsorshipId, githubSponsorId: 999, userId, tierId: "TIER_COACH", tierName: "Coach",
                  monthlyPriceCents: 900, isOneTime: false, privacyLevel: "PUBLIC", status: "cancelled", updatedAt: 99,
                });
                await revokeEntitlementIfSource(db as any, userId, "coach", "github-sponsors", sponsorshipId, 99);
              }
              return result;
            },
            run: () => bound.run(),
          };
        },
      };
    },
  };
}

describe("coach config", () => {
  it("accepts only an exact GitHub Sponsors account URL", () => {
    expect(normalizeGithubSponsorsUrl("https://github.com/sponsors/artem")).toEqual({
      url: "https://github.com/sponsors/artem",
      login: "artem",
    });
    for (const value of [
      "http://github.com/sponsors/artem",
      "https://github.example/sponsors/artem",
      "https://github.com/sponsors/artem?x=1",
      "https://github.com/artem",
    ]) expect(normalizeGithubSponsorsUrl(value)).toBeNull();
  });

  it("does not advertise billing until URL, webhook secret and exact coach tier are all configured", () => {
    const base: any = { GITHUB_SPONSORS_URL: "https://github.com/sponsors/artem" };
    expect(coachConfig(base).billingConfigured).toBe(false);
    expect(coachConfig({ ...base, GITHUB_SPONSORS_WEBHOOK_SECRET: "secret" } as any).billingConfigured).toBe(false);
    const cfg = coachConfig({
      ...base,
      GITHUB_SPONSORS_WEBHOOK_SECRET: "secret",
      GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_123",
    } as any);
    expect(cfg.billingConfigured).toBe(true);
    expect(coachTierQualifies({ node_id: "TIER_123", is_one_time: false }, cfg)).toBe(true);
    expect(coachTierQualifies({ node_id: "TIER_123", is_one_time: true }, cfg)).toBe(false);
    expect(coachTierQualifies({ node_id: "OTHER", is_one_time: false }, cfg)).toBe(false);
  });

  it("validates GitHub webhook HMAC-SHA256 over the raw body", async () => {
    const raw = new TextEncoder().encode('{"action":"created"}');
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("top-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, raw));
    const hex = Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
    const buffer = raw.buffer as ArrayBuffer;
    expect(await verifyGithubWebhookSignature(buffer, `sha256=${hex}`, "top-secret")).toBe(true);
    expect(await verifyGithubWebhookSignature(buffer, `sha256=${"0".repeat(64)}`, "top-secret")).toBe(false);
    expect(await verifyGithubWebhookSignature(buffer, null, "top-secret")).toBe(false);
  });

  it("reconciles a qualifying sponsorship created before the user's first Skein login", async () => {
    const db = new FakeD1();
    await upsertGithubSponsorship(db as any, {
      sponsorshipId: "S_PRELOGIN",
      githubSponsorId: 999,
      userId: null,
      tierId: "TIER_COACH",
      tierName: "Coach",
      monthlyPriceCents: 900,
      isOneTime: false,
      privacyLevel: "PUBLIC",
      status: "created",
      updatedAt: 1,
    });
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    const cfg = coachConfig({ GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" } as any);

    await reconcileGithubSponsorOnLogin(db as any, 999, user.id, cfg, 2);

    expect(await getGithubSponsorshipUserId(db as any, "S_PRELOGIN")).toBe(user.id);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(true);
  });

  it("does not revoke a newer Coach source while reconciling a stale non-qualifying sponsorship", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    await setEntitlement(db as any, user.id, "coach", true, "github-sponsors", "S_NEW", 10);
    await upsertGithubSponsorship(db as any, {
      sponsorshipId: "S_STALE",
      githubSponsorId: 999,
      userId: user.id,
      tierId: "OTHER_TIER",
      tierName: "Other",
      monthlyPriceCents: 100,
      isOneTime: false,
      privacyLevel: "PUBLIC",
      status: "cancelled",
      updatedAt: 20,
    });
    const cfg = coachConfig({ GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" } as any);

    await reconcileGithubSponsorOnLogin(db as any, 999, user.id, cfg, 21);

    expect(await getEntitlement(db as any, user.id, "coach")).toBe(true);
  });

  it("does not resurrect a sponsorship cancelled after the pre-login read", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    await upsertGithubSponsorship(db as any, {
      sponsorshipId: "S_RACE_PRELOGIN", githubSponsorId: 999, userId: user.id, tierId: "TIER_COACH",
      tierName: "Coach", monthlyPriceCents: 900, isOneTime: false, privacyLevel: "PUBLIC", status: "created", updatedAt: 1,
    });
    await reconcileGithubSponsorOnLogin(cancellationAfterRead(db, "by-sponsor", "S_RACE_PRELOGIN", user.id) as any, 999, user.id, coachConfig({ GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" } as any), 2);
    expect(db.sponsorships.get("S_RACE_PRELOGIN")?.status).toBe("cancelled");
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(false);
  });

  it("grants a private verified sponsorship without requiring public visibility", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    const cfg = coachConfig({ GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" } as any);

    await reconcileVerifiedGithubSponsorOnLogin(db as any, 999, user.id, cfg, {
      sponsorshipId: "S_PRIVATE",
      tierId: "TIER_COACH",
      tierName: "Coach",
      monthlyPriceCents: 900,
      isOneTime: false,
      privacyLevel: "PRIVATE",
    }, 5);

    expect(await getGithubSponsorshipUserId(db as any, "S_PRIVATE")).toBe(user.id);
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(true);
    expect(db.sponsorships.get("S_PRIVATE")?.privacy_level).toBe("PRIVATE");
  });

  it("does not resurrect a sponsorship cancelled after the verified read", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    await upsertGithubSponsorship(db as any, {
      sponsorshipId: "S_RACE_VERIFIED", githubSponsorId: 999, userId: user.id, tierId: "TIER_COACH",
      tierName: "Coach", monthlyPriceCents: 900, isOneTime: false, privacyLevel: "PUBLIC", status: "created", updatedAt: 1,
    });
    await reconcileVerifiedGithubSponsorOnLogin(
      cancellationAfterRead(db, "by-id", "S_RACE_VERIFIED", user.id) as any,
      999, user.id, coachConfig({ GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" } as any),
      { sponsorshipId: "S_RACE_VERIFIED", tierId: "TIER_COACH", tierName: "Coach", monthlyPriceCents: 900, isOneTime: false, privacyLevel: "PUBLIC" }, 2,
    );
    expect(db.sponsorships.get("S_RACE_VERIFIED")?.status).toBe("cancelled");
    expect(await getEntitlement(db as any, user.id, "coach")).toBe(false);
  });

  it("revokes its own stale sponsorship when OAuth verifies there is no active sponsorship", async () => {
    const db = new FakeD1();
    const user = await upsertUserFromGithub(db as any, { id: 999, login: "octocat", avatar_url: null });
    await upsertGithubSponsorship(db as any, {
      sponsorshipId: "S_OLD",
      githubSponsorId: 999,
      userId: user.id,
      tierId: "TIER_COACH",
      tierName: "Coach",
      monthlyPriceCents: 900,
      isOneTime: false,
      privacyLevel: "PRIVATE",
      status: "verified",
      updatedAt: 1,
    });
    await setEntitlement(db as any, user.id, "coach", true, "github-sponsors", "S_OLD", 1);
    const cfg = coachConfig({ GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" } as any);

    await reconcileVerifiedGithubSponsorOnLogin(db as any, 999, user.id, cfg, null, 2);

    expect(await getEntitlement(db as any, user.id, "coach")).toBe(false);
  });
});
