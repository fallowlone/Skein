// functions/lib/db.test.ts
import { describe, it, expect } from "vitest";
import {
  upsertUserFromGithub, getUserById, setNickname, acceptTerms,
  deleteUser, getProgress, putProgress, validateNickname,
  getEntitlement, setEntitlement, revokeEntitlementIfSource, recordBillingDelivery, hasBillingDelivery,
  upsertGithubSponsorship,
  reserveAiUse, releaseAiUse, getAiUsage,
} from "./db";
import { FakeD1 } from "../test/fakes";

const gh = { id: 999, login: "octocat", avatar_url: "https://x/y.png" };

describe("db", () => {
  it("first sign-in inserts with nickname=login; return preserves chosen nickname", async () => {
    const db = new FakeD1() as any;
    const u1 = await upsertUserFromGithub(db, gh);
    expect(u1.nickname).toBe("octocat");
    await setNickname(db, u1.id, "Cat Master");
    const u2 = await upsertUserFromGithub(db, { ...gh, login: "octocat-renamed", avatar_url: "https://x/z.png" });
    expect(u2.id).toBe(u1.id);
    expect(u2.nickname).toBe("Cat Master");     // preserved
    expect(u2.login).toBe("octocat-renamed");   // refreshed
    expect(u2.avatar_url).toBe("https://x/z.png");
  });

  it("acceptTerms records version + timestamp", async () => {
    const db = new FakeD1() as any;
    const u = await upsertUserFromGithub(db, gh);
    await acceptTerms(db, u.id, "2026-05-29", 1000);
    const fresh = await getUserById(db, u.id);
    expect(fresh!.terms_version).toBe("2026-05-29");
    expect(fresh!.terms_accepted_at).toBe(1000);
  });

  it("progress round-trips and deleteUser cascades", async () => {
    const db = new FakeD1() as any;
    const u = await upsertUserFromGithub(db, gh);
    await putProgress(db, u.id, '{"tier":"senior"}', 5);
    await upsertGithubSponsorship(db, {
      sponsorshipId: "S_delete",
      githubSponsorId: gh.id,
      userId: u.id,
      tierId: "TIER_COACH",
      tierName: "Coach",
      monthlyPriceCents: 900,
      isOneTime: false,
      privacyLevel: "PUBLIC",
      status: "created",
      updatedAt: 5,
    });
    expect(await getProgress(db, u.id)).toBe('{"tier":"senior"}');
    expect(db.sponsorships.size).toBe(1);
    await deleteUser(db, u.id);
    expect(await getUserById(db, u.id)).toBeNull();
    expect(await getProgress(db, u.id)).toBeNull();
    expect(db.sponsorships.size).toBe(0);
  });

  it("validateNickname accepts/rejects", () => {
    expect(validateNickname("ab").ok).toBe(true);
    expect(validateNickname("Cat Master_1.2-3").ok).toBe(true);
    expect(validateNickname("a").ok).toBe(false);          // too short
    expect(validateNickname("x".repeat(33)).ok).toBe(false); // too long
    expect(validateNickname("bad<script>").ok).toBe(false);  // bad chars
    expect(validateNickname("  ab  ").value).toBe("ab");     // trimmed
  });

  it("centrally grants and revokes coach entitlement", async () => {
    const db = new FakeD1() as any;
    const u = await upsertUserFromGithub(db, gh);
    expect(await getEntitlement(db, u.id, "coach")).toBe(false);
    await setEntitlement(db, u.id, "coach", true, "github-sponsors", "S_1", 10);
    expect(await getEntitlement(db, u.id, "coach")).toBe(true);
    await setEntitlement(db, u.id, "coach", false, "github-sponsors", "S_1", 20);
    expect(await getEntitlement(db, u.id, "coach")).toBe(false);
  });

  it("only revokes an entitlement from the sponsorship that currently owns it", async () => {
    const db = new FakeD1() as any;
    const u = await upsertUserFromGithub(db, gh);
    await setEntitlement(db, u.id, "coach", true, "github-sponsors", "S_new", 10);
    expect(await revokeEntitlementIfSource(db, u.id, "coach", "github-sponsors", "S_old", 11)).toBe(false);
    expect(await getEntitlement(db, u.id, "coach")).toBe(true);
    expect(await revokeEntitlementIfSource(db, u.id, "coach", "github-sponsors", "S_new", 12)).toBe(true);
    expect(await getEntitlement(db, u.id, "coach")).toBe(false);
  });

  it("deduplicates billing deliveries", async () => {
    const db = new FakeD1() as any;
    const payloadHash = "a".repeat(64);
    expect(await hasBillingDelivery(db, "delivery-1", payloadHash)).toBe(false);
    expect(await recordBillingDelivery(db, "delivery-1", payloadHash, "sponsorship", "created", 1)).toBe(true);
    expect(await hasBillingDelivery(db, "delivery-1", payloadHash)).toBe(true);
    expect(await recordBillingDelivery(db, "delivery-1", payloadHash, "sponsorship", "created", 2)).toBe(false);
    expect(await recordBillingDelivery(db, "delivery-2", payloadHash, "sponsorship", "created", 3)).toBe(false);
  });

  it("reserves monthly AI usage atomically and releases failed calls", async () => {
    const db = new FakeD1() as any;
    const u = await upsertUserFromGithub(db, gh);
    expect(await reserveAiUse(db, u.id, "practice-grade", "2026-09", 2, 1)).toBe(1);
    expect(await reserveAiUse(db, u.id, "practice-grade", "2026-09", 2, 2)).toBe(2);
    expect(await reserveAiUse(db, u.id, "practice-grade", "2026-09", 2, 3)).toBeNull();
    await releaseAiUse(db, u.id, "practice-grade", "2026-09", 4);
    expect(await getAiUsage(db, u.id, "practice-grade", "2026-09")).toBe(1);
    expect(await reserveAiUse(db, u.id, "practice-grade", "2026-09", 2, 5)).toBe(2);
  });
});
