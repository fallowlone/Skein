// This executable check runs under Bun, while the deployed Functions typecheck
// intentionally has no Node/Bun runtime types in its dependency tree.
// @ts-nocheck
import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { onRequestPost } from "../api/billing/github-sponsors";
import { coachConfig, reconcileGithubSponsorOnLogin, reconcileVerifiedGithubSponsorOnLogin, resolveCoachAccess } from "./coach";
import { getEntitlementState, grantEntitlementIfSponsorshipActive, revokeEntitlementIfSource, upsertGithubSponsorship } from "./db";

type SqliteStatement = {
  get: (...args: unknown[]) => unknown;
  run: (...args: unknown[]) => { changes: number | bigint };
};

/** D1-shaped adapter around Bun's actual SQLite engine, with the reviewer race barrier. */
class SqliteD1 {
  private reads = 0;
  private releaseReads!: () => void;
  private readsReleased = new Promise<void>(resolve => { this.releaseReads = resolve; });
  private cancelWritten!: () => void;
  private cancelDone = new Promise<void>(resolve => { this.cancelWritten = resolve; });

  constructor(private readonly sqlite: { prepare(sql: string): SqliteStatement }, private readonly scheduleRace = true) {}

  prepare(sql: string) {
    const statement = this.sqlite.prepare(sql);
    const isSponsorshipRead = sql.includes("SELECT sponsorship_id") && sql.includes("WHERE sponsorship_id = ?");
    const isSponsorshipUpsert = sql.startsWith("INSERT INTO github_sponsorships");
    return {
      bind: (...args: unknown[]) => ({
        first: async <T>() => {
          if (this.scheduleRace && isSponsorshipRead) {
            this.reads += 1;
            if (this.reads === 2) this.releaseReads();
            await this.readsReleased;
          }
          return (statement.get(...args) ?? null) as T | null;
        },
        run: async () => {
          const status = isSponsorshipUpsert ? args[8] : undefined;
          if (this.scheduleRace && status === "edited") await this.cancelDone;
          const result = statement.run(...args);
          if (this.scheduleRace && status === "cancelled") this.cancelWritten();
          return { success: true, meta: { changes: Number(result.changes), last_row_id: 0 } };
        },
      }),
    };
  }
}

class CancelAfterReadD1 {
  private cancelled = false;
  constructor(private readonly sqlite: { prepare(sql: string): SqliteStatement }, private readonly kind: "by-sponsor" | "by-id") {}
  prepare(sql: string) {
    const statement = this.sqlite.prepare(sql);
    const intercepted = this.kind === "by-sponsor"
      ? sql.includes("SELECT sponsorship_id") && sql.includes("WHERE github_sponsor_id")
      : sql.includes("SELECT sponsorship_id") && sql.includes("WHERE sponsorship_id");
    return { bind: (...args: unknown[]) => ({
      first: async <T>() => {
        const result = (statement.get(...args) ?? null) as T | null;
        if (intercepted && !this.cancelled) {
          this.cancelled = true;
          await upsertGithubSponsorship(this as any, {
            sponsorshipId: "S_RACE", githubSponsorId: 999, userId: 1, tierId: "TIER_COACH", tierName: "Coach",
            monthlyPriceCents: 900, isOneTime: false, privacyLevel: "PUBLIC", status: "cancelled", updatedAt: 99,
          });
          await revokeEntitlementIfSource(this as any, 1, "coach", "github-sponsors", "S_RACE", 99);
        }
        return result;
      },
      run: async () => { const result = statement.run(...args); return { success: true, meta: { changes: Number(result.changes), last_row_id: 0 } }; },
    })};
  }
}

class TierRaceD1 {
  private reads = 0;
  private releaseReads!: () => void;
  private readsReleased = new Promise<void>(resolve => { this.releaseReads = resolve; });
  private freeWritten!: () => void;
  private freeDone = new Promise<void>(resolve => { this.freeWritten = resolve; });
  constructor(private readonly sqlite: { prepare(sql: string): SqliteStatement }) {}
  prepare(sql: string) {
    const statement = this.sqlite.prepare(sql);
    const read = sql.includes("SELECT sponsorship_id") && sql.includes("WHERE sponsorship_id = ?");
    const upsert = sql.startsWith("INSERT INTO github_sponsorships");
    return { bind: (...args: unknown[]) => ({
      first: async <T>() => {
        if (read) { this.reads += 1; if (this.reads === 2) this.releaseReads(); await this.readsReleased; }
        return (statement.get(...args) ?? null) as T | null;
      },
      run: async () => {
        const tierId = upsert ? args[3] : undefined;
        if (tierId === "TIER_COACH") await this.freeDone;
        const result = statement.run(...args);
        if (tierId === "TIER_FREE") this.freeWritten();
        return { success: true, meta: { changes: Number(result.changes), last_row_id: 0 } };
      },
    })};
  }
}

class DowngradeBeforeGrantD1 {
  constructor(private readonly sqlite: { prepare(sql: string): SqliteStatement }) {}
  prepare(sql: string) {
    const statement = this.sqlite.prepare(sql);
    const upsert = sql.startsWith("INSERT INTO github_sponsorships");
    return { bind: (...args: unknown[]) => ({
      first: async <T>() => (statement.get(...args) ?? null) as T | null,
      run: async () => {
        const result = statement.run(...args);
        if (upsert && args[8] === "verified") {
          await upsertGithubSponsorship(this as any, {
            sponsorshipId: "S_LIVE", githubSponsorId: 999, userId: 1, tierId: "TIER_FREE", tierName: "Free",
            monthlyPriceCents: 100, isOneTime: false, privacyLevel: "PUBLIC", status: "tier_changed", updatedAt: 11,
            expectedTierId: "TIER_COACH", expectedIsOneTime: false,
          });
          await revokeEntitlementIfSource(this as any, 1, "coach", "github-sponsors", "S_LIVE", 11);
        }
        return { success: true, meta: { changes: Number(result.changes), last_row_id: 0 } };
      },
    })};
  }
}

function migration(name: string): string {
  return readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
}

async function signedRequest(body: unknown, delivery: string) {
  const text = JSON.stringify(body);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
  const signature = `sha256=${Array.from(mac, byte => byte.toString(16).padStart(2, "0")).join("")}`;
  return new Request("https://skein.test/api/billing/github-sponsors", {
    method: "POST", body: text,
    headers: { "X-GitHub-Event": "sponsorship", "X-GitHub-Delivery": delivery, "X-Hub-Signature-256": signature },
  });
}

const { Database } = await import("bun:sqlite");
const sqlite = new Database(":memory:");
sqlite.exec(migration("0001_init.sql"));
sqlite.exec(migration("0003_coach_entitlements.sql"));
sqlite.exec(migration("0004_coach_verification.sql"));
sqlite.exec("INSERT INTO users (github_id, login, nickname, created_at) VALUES (999, 'octocat', 'octocat', 1)");
const db = new SqliteD1(sqlite) as any;
const payload = (action: string, tierId = "TIER_COACH", from?: { node_id: string; name: string; monthly_price_in_cents: number; is_one_time: boolean }, sponsorshipId = "S_123") => ({ action, sponsorship: {
  node_id: sponsorshipId, sponsor: { id: 999, login: "octocat", type: "User" },
  sponsorable: { login: "skein-owner" }, privacy_level: "PUBLIC",
  tier: { node_id: tierId, name: tierId === "TIER_FREE" ? "Free" : "Coach", monthly_price_in_cents: tierId === "TIER_FREE" ? 100 : 900, is_one_time: false },
}, ...(from ? { changes: { tier: { from } } } : {}) });
const env = { DB: db, GITHUB_SPONSORS_URL: "https://github.com/sponsors/skein-owner", GITHUB_SPONSORS_WEBHOOK_SECRET: "secret", GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" };

const [edited, cancelled] = await Promise.all([
  onRequestPost({ request: await signedRequest(payload("edited"), "delivery-edited"), env, data: {} } as any),
  onRequestPost({ request: await signedRequest(payload("cancelled"), "delivery-cancelled"), env, data: {} } as any),
]);
assert.equal(edited.status, 200);
assert.equal(cancelled.status, 200);
assert.deepEqual(sqlite.prepare("SELECT status FROM github_sponsorships WHERE sponsorship_id = ?").get("S_123"), { status: "cancelled" });
assert.equal(await grantEntitlementIfSponsorshipActive(db, 1, "coach", "github-sponsors", "S_123", "TIER_COACH", false, 12), false);
assert.equal((await getEntitlementState(db, 1, "coach"))?.active ?? false, false);

sqlite.prepare("INSERT INTO entitlements (user_id, entitlement, active, source, source_ref, updated_at) VALUES (1, 'coach', 1, 'github-sponsors', 'S_123', 10)").run();
assert.equal(await revokeEntitlementIfSource(db, 1, "coach", "github-sponsors", "S_123", 13), true);
assert.equal((await getEntitlementState(db, 1, "coach"))?.active, false);
console.log("db.sqlite.integration: PASS forced read-barrier cancellation-before-edited race");

async function reconciliationRace(kind: "by-sponsor" | "by-id") {
  const local = new Database(":memory:");
  local.exec(migration("0001_init.sql"));
  local.exec(migration("0003_coach_entitlements.sql"));
  local.exec(migration("0004_coach_verification.sql"));
  local.exec("INSERT INTO users (github_id, login, nickname, created_at) VALUES (999, 'octocat', 'octocat', 1)");
  local.prepare("INSERT INTO github_sponsorships (sponsorship_id, github_sponsor_id, user_id, tier_id, tier_name, monthly_price_cents, is_one_time, privacy_level, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("S_RACE", 999, 1, "TIER_COACH", "Coach", 900, 0, "PUBLIC", "created", 1);
  const raced = new CancelAfterReadD1(local, kind) as any;
  const cfg = { GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" } as any;
  if (kind === "by-sponsor") {
    await reconcileGithubSponsorOnLogin(raced, 999, 1, coachConfig(cfg), 2);
  } else {
    await reconcileVerifiedGithubSponsorOnLogin(raced, 999, 1, coachConfig(cfg), {
      sponsorshipId: "S_RACE", tierId: "TIER_COACH", tierName: "Coach", monthlyPriceCents: 900, isOneTime: false, privacyLevel: "PUBLIC",
    }, 2);
  }
  assert.equal(local.prepare("SELECT status FROM github_sponsorships WHERE sponsorship_id = ?").get("S_RACE").status, "cancelled");
  assert.equal(local.prepare("SELECT active FROM entitlements WHERE user_id = 1 AND entitlement = 'coach'").get()?.active ?? 0, 0);
}

await reconciliationRace("by-sponsor");
await reconciliationRace("by-id");
console.log("db.sqlite.integration: PASS both reconciliation cancellation-after-read races");

const ordered = new Database(":memory:");
ordered.exec(migration("0001_init.sql"));
ordered.exec(migration("0003_coach_entitlements.sql"));
ordered.exec(migration("0004_coach_verification.sql"));
ordered.exec("INSERT INTO users (github_id, login, nickname, created_at) VALUES (999, 'octocat', 'octocat', 1)");
const orderedDb = new SqliteD1(ordered, false) as any;
await upsertGithubSponsorship(orderedDb, {
  sponsorshipId: "S_ORDERED", githubSponsorId: 999, userId: 1, tierId: "TIER_COACH", tierName: "Coach",
  monthlyPriceCents: 900, isOneTime: false, privacyLevel: "PUBLIC", status: "edited", updatedAt: 10,
});
assert.equal(await grantEntitlementIfSponsorshipActive(orderedDb, 1, "coach", "github-sponsors", "S_ORDERED", "TIER_COACH", false, 10), true);
await upsertGithubSponsorship(orderedDb, {
  sponsorshipId: "S_ORDERED", githubSponsorId: 999, userId: 1, tierId: "TIER_COACH", tierName: "Coach",
  monthlyPriceCents: 900, isOneTime: false, privacyLevel: "PUBLIC", status: "cancelled", updatedAt: 11,
});
assert.equal(await revokeEntitlementIfSource(orderedDb, 1, "coach", "github-sponsors", "S_ORDERED", 11), true);
assert.equal(ordered.prepare("SELECT status FROM github_sponsorships WHERE sponsorship_id = ?").get("S_ORDERED").status, "cancelled");
assert.equal(ordered.prepare("SELECT active FROM entitlements WHERE user_id = 1 AND entitlement = 'coach'").get().active, 0);
console.log("db.sqlite.integration: PASS edited-before-cancelled order");

const tierDb = new Database(":memory:");
tierDb.exec(migration("0001_init.sql"));
tierDb.exec(migration("0003_coach_entitlements.sql"));
tierDb.exec(migration("0004_coach_verification.sql"));
tierDb.exec("INSERT INTO users (github_id, login, nickname, created_at) VALUES (999, 'octocat', 'octocat', 1)");
tierDb.prepare("INSERT INTO github_sponsorships (sponsorship_id, github_sponsor_id, user_id, tier_id, tier_name, monthly_price_cents, is_one_time, privacy_level, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("S_TIER", 999, 1, "TIER_COACH", "Coach", 900, 0, "PUBLIC", "created", 1);
const tierD1 = new TierRaceD1(tierDb) as any;
const previousTier = { node_id: "TIER_COACH", name: "Coach", monthly_price_in_cents: 900, is_one_time: false };
const [staleQualifying, effectiveFree] = await Promise.all([
  onRequestPost({ request: await signedRequest(payload("tier_changed", "TIER_COACH", previousTier, "S_TIER"), "delivery-stale-tier"), env: { ...env, DB: tierD1 }, data: {} } as any),
  onRequestPost({ request: await signedRequest(payload("tier_changed", "TIER_FREE", previousTier, "S_TIER"), "delivery-free-tier"), env: { ...env, DB: tierD1 }, data: {} } as any),
]);
assert.equal(staleQualifying.status, 200);
assert.equal(effectiveFree.status, 200);
assert.equal(tierDb.prepare("SELECT tier_id FROM github_sponsorships WHERE sponsorship_id = ?").get("S_TIER").tier_id, "TIER_FREE");
assert.equal(tierDb.prepare("SELECT active FROM entitlements WHERE user_id = 1 AND entitlement = 'coach'").get()?.active ?? 0, 0);
console.log("db.sqlite.integration: PASS stale qualifying tier_changed cannot resurrect effective downgrade");

const liveDb = new Database(":memory:");
liveDb.exec(migration("0001_init.sql"));
liveDb.exec(migration("0003_coach_entitlements.sql"));
liveDb.exec(migration("0004_coach_verification.sql"));
liveDb.exec("INSERT INTO users (github_id, login, nickname, created_at) VALUES (999, 'octocat', 'octocat', 1)");
liveDb.prepare("INSERT INTO github_sponsorships (sponsorship_id, github_sponsor_id, user_id, tier_id, tier_name, monthly_price_cents, is_one_time, privacy_level, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("S_LIVE", 999, 1, "TIER_COACH", "Coach", 900, 0, "PUBLIC", "created", 1);
liveDb.prepare("INSERT INTO entitlements (user_id, entitlement, active, source, source_ref, updated_at) VALUES (1, 'coach', 1, 'github-sponsors', 'S_LIVE', 1)").run();
const liveCfg = coachConfig({ GITHUB_SPONSORS_URL: "https://github.com/sponsors/skein-owner", GITHUB_SPONSORS_WEBHOOK_SECRET: "secret", GITHUB_SPONSORS_COACH_TIER_IDS: "TIER_COACH" } as any);
const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => new Response(JSON.stringify({ data: { user: {
  sponsorshipForViewerAsSponsor: { id: "S_LIVE", privacyLevel: "PUBLIC", tier: { id: "TIER_COACH", name: "Coach", monthlyPriceInCents: 900, isOneTime: false }, },
} } }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
const liveAccess = await resolveCoachAccess(new DowngradeBeforeGrantD1(liveDb) as any, liveCfg, 1, "live-token", false, 10);
globalThis.fetch = originalFetch;
assert.equal(liveAccess.coach, false);
assert.equal(liveAccess.state, "verified");
assert.equal(liveDb.prepare("SELECT tier_id FROM github_sponsorships WHERE sponsorship_id = ?").get("S_LIVE").tier_id, "TIER_FREE");
assert.deepEqual(liveDb.prepare("SELECT active, verified_at FROM entitlements WHERE user_id = 1 AND entitlement = 'coach'").get(), { active: 0, verified_at: null });
console.log("db.sqlite.integration: PASS resolver zero-grant does not freshen stale entitlement");
