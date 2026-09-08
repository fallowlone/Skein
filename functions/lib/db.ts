/// <reference types="@cloudflare/workers-types" />
import type { UserRow, Env } from "./types";

export interface GithubUser { id: number; login: string; avatar_url: string | null; }

/**
 * Single source of truth for the terms gate: a user has current terms when they
 * have accepted AND the accepted version matches the active TERMS_VERSION.
 * Bumping TERMS_VERSION re-gates every user until they re-accept.
 */
export function termsCurrent(u: UserRow, env: Env): boolean {
  return u.terms_accepted_at != null && u.terms_version === env.TERMS_VERSION;
}

export async function getUserById(db: D1Database, id: number): Promise<UserRow | null> {
  return await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

export async function getUserByGithubId(db: D1Database, githubId: number): Promise<UserRow | null> {
  return await db.prepare("SELECT * FROM users WHERE github_id = ?").bind(githubId).first<UserRow>();
}

/** Insert on first sign-in (nickname defaults to login); else refresh login+avatar, keep nickname. */
export async function upsertUserFromGithub(db: D1Database, gh: GithubUser): Promise<UserRow> {
  const existing = await getUserByGithubId(db, gh.id);
  if (!existing) {
    const now = Date.now();
    const res = await db
      .prepare("INSERT INTO users (github_id, login, nickname, avatar_url, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(gh.id, gh.login, gh.login, gh.avatar_url, now)
      .run();
    const id = res.meta.last_row_id;
    return (await getUserById(db, id))!;
  }
  await db
    .prepare("UPDATE users SET login = ?, avatar_url = ? WHERE github_id = ?")
    .bind(gh.login, gh.avatar_url, gh.id)
    .run();
  return (await getUserByGithubId(db, gh.id))!;
}

export async function setNickname(db: D1Database, id: number, nickname: string): Promise<void> {
  await db.prepare("UPDATE users SET nickname = ? WHERE id = ?").bind(nickname, id).run();
}

export async function acceptTerms(db: D1Database, id: number, version: string, at: number): Promise<void> {
  await db.prepare("UPDATE users SET terms_version = ?, terms_accepted_at = ? WHERE id = ?")
    .bind(version, at, id).run();
}

export async function deleteUser(db: D1Database, id: number): Promise<void> {
  // explicit progress delete in addition to ON DELETE CASCADE (defensive)
  await db.prepare("DELETE FROM progress WHERE user_id = ?").bind(id).run();
  // Billing metadata is not needed after account deletion and should not retain
  // an otherwise deleted GitHub identity through ON DELETE SET NULL.
  await db.prepare("DELETE FROM github_sponsorships WHERE user_id = ?").bind(id).run();
  await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
}

export async function getEntitlement(db: D1Database, userId: number, entitlement: string): Promise<boolean> {
  const row = await db.prepare("SELECT active FROM entitlements WHERE user_id = ? AND entitlement = ?")
    .bind(userId, entitlement).first<{ active: number }>();
  return row?.active === 1;
}

export interface EntitlementState { active: boolean; source: string; sourceRef: string | null; verifiedAt: number | null; }

export async function getEntitlementState(db: D1Database, userId: number, entitlement: string): Promise<EntitlementState | null> {
  const row = await db.prepare("SELECT active, source, source_ref, verified_at FROM entitlements WHERE user_id = ? AND entitlement = ?")
    .bind(userId, entitlement).first<{ active: number; source: string; source_ref: string | null; verified_at: number | null }>();
  return row ? { active: row.active === 1, source: row.source, sourceRef: row.source_ref, verifiedAt: row.verified_at ?? null } : null;
}

export async function markEntitlementVerified(
  db: D1Database, userId: number, entitlement: string, verifiedAt: number, source: string, sourceRef: string | null,
): Promise<boolean> {
  const result = await db.prepare(
    "UPDATE entitlements SET verified_at = ? WHERE user_id = ? AND entitlement = ? AND source = ? " +
    "AND (source_ref = ? OR (source_ref IS NULL AND ? IS NULL))",
  ).bind(verifiedAt, userId, entitlement, source, sourceRef, sourceRef).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function setEntitlement(
  db: D1Database,
  userId: number,
  entitlement: string,
  active: boolean,
  source: string,
  sourceRef: string | null,
  now: number,
  verifiedAt: number | null = null,
): Promise<void> {
  await db.prepare(
    "INSERT INTO entitlements (user_id, entitlement, active, source, source_ref, granted_at, updated_at, verified_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, entitlement) DO UPDATE SET " +
    "active = excluded.active, source = excluded.source, source_ref = excluded.source_ref, " +
    "granted_at = CASE WHEN excluded.active = 1 AND entitlements.active = 0 THEN excluded.granted_at ELSE entitlements.granted_at END, " +
    "updated_at = excluded.updated_at, verified_at = excluded.verified_at",
  ).bind(userId, entitlement, active ? 1 : 0, source, sourceRef, active ? now : null, now, verifiedAt).run();
}

/** Grant only while the provider row is currently live; the SELECT and upsert are one SQLite statement. */
export async function grantEntitlementIfSponsorshipActive(
  db: D1Database, userId: number, entitlement: string, source: string, sponsorshipId: string,
  tierId: string, isOneTime: boolean, now: number,
): Promise<boolean> {
  const result = await db.prepare(
    "INSERT INTO entitlements (user_id, entitlement, active, source, source_ref, granted_at, updated_at, verified_at) " +
    "SELECT ?, ?, 1, ?, sponsorship_id, ?, ?, NULL FROM github_sponsorships " +
    "WHERE sponsorship_id = ? AND user_id = ? AND status <> 'cancelled' AND tier_id = ? AND is_one_time = ? " +
    "ON CONFLICT(user_id, entitlement) DO UPDATE SET active = 1, source = excluded.source, " +
    "source_ref = excluded.source_ref, granted_at = CASE WHEN entitlements.active = 0 THEN excluded.granted_at ELSE entitlements.granted_at END, " +
    "updated_at = excluded.updated_at, verified_at = NULL " +
    "WHERE entitlements.active = 0 OR entitlements.source = excluded.source",
  ).bind(userId, entitlement, source, now, now, sponsorshipId, userId, tierId, isOneTime ? 1 : 0).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function revokeEntitlementIfSource(
  db: D1Database,
  userId: number,
  entitlement: string,
  source: string,
  sourceRef: string,
  now: number,
): Promise<boolean> {
  const result = await db.prepare(
    "UPDATE entitlements SET active = 0, granted_at = NULL, updated_at = ?, verified_at = NULL " +
    "WHERE user_id = ? AND entitlement = ? AND source = ? AND source_ref = ? AND active = 1",
  ).bind(now, userId, entitlement, source, sourceRef).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function recordBillingDelivery(
  db: D1Database, deliveryId: string, payloadHash: string, event: string, action: string, now: number,
): Promise<boolean> {
  const result = await db.prepare(
    "INSERT OR IGNORE INTO billing_deliveries (delivery_id, payload_hash, event, action, received_at) VALUES (?, ?, ?, ?, ?)",
  ).bind(deliveryId, payloadHash, event, action, now).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function hasBillingDelivery(db: D1Database, deliveryId: string, payloadHash: string): Promise<boolean> {
  return Boolean(await db.prepare("SELECT delivery_id FROM billing_deliveries WHERE delivery_id = ? OR payload_hash = ?")
    .bind(deliveryId, payloadHash).first<{ delivery_id: string }>());
}

export interface GithubSponsorshipState {
  sponsorshipId: string;
  githubSponsorId: number | null;
  userId: number | null;
  tierId: string;
  tierName: string;
  monthlyPriceCents: number;
  isOneTime: boolean;
  privacyLevel: string;
  status: string;
}

function sponsorshipState(row: {
  sponsorship_id: string;
  github_sponsor_id: number | null;
  user_id: number | null;
  tier_id: string;
  tier_name: string;
  monthly_price_cents: number;
  is_one_time: number;
  privacy_level: string;
  status: string;
}): GithubSponsorshipState {
  return {
    sponsorshipId: row.sponsorship_id,
    githubSponsorId: row.github_sponsor_id,
    userId: row.user_id,
    tierId: row.tier_id,
    tierName: row.tier_name,
    monthlyPriceCents: row.monthly_price_cents,
    isOneTime: row.is_one_time === 1,
    privacyLevel: row.privacy_level,
    status: row.status,
  };
}

export async function upsertGithubSponsorship(
  db: D1Database,
  row: {
    sponsorshipId: string;
    githubSponsorId: number | null;
    userId: number | null;
    tierId: string;
    tierName: string;
    monthlyPriceCents: number;
    isOneTime: boolean;
    privacyLevel: string;
    status: string;
    updatedAt: number;
    expectedTierId?: string | null;
    expectedIsOneTime?: boolean | null;
  },
): Promise<void> {
  await db.prepare(
    "INSERT INTO github_sponsorships " +
    "(sponsorship_id, github_sponsor_id, user_id, tier_id, tier_name, monthly_price_cents, is_one_time, privacy_level, status, updated_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(sponsorship_id) DO UPDATE SET " +
    "github_sponsor_id = excluded.github_sponsor_id, user_id = excluded.user_id, tier_id = excluded.tier_id, " +
    "tier_name = excluded.tier_name, monthly_price_cents = excluded.monthly_price_cents, is_one_time = excluded.is_one_time, " +
    "privacy_level = excluded.privacy_level, status = excluded.status, updated_at = excluded.updated_at " +
    "WHERE (github_sponsorships.status <> 'cancelled' OR excluded.status = 'cancelled') " +
    "AND (? IS NULL OR github_sponsorships.tier_id = ?) " +
    "AND (? IS NULL OR github_sponsorships.is_one_time = ?)",
  ).bind(
    row.sponsorshipId, row.githubSponsorId, row.userId, row.tierId, row.tierName,
    row.monthlyPriceCents, row.isOneTime ? 1 : 0, row.privacyLevel, row.status, row.updatedAt,
    row.expectedTierId ?? null, row.expectedTierId ?? null,
    row.expectedIsOneTime == null ? null : (row.expectedIsOneTime ? 1 : 0),
    row.expectedIsOneTime == null ? null : (row.expectedIsOneTime ? 1 : 0),
  ).run();
}

export async function getGithubSponsorshipUserId(db: D1Database, sponsorshipId: string): Promise<number | null> {
  const row = await db.prepare("SELECT user_id FROM github_sponsorships WHERE sponsorship_id = ?")
    .bind(sponsorshipId).first<{ user_id: number | null }>();
  return row?.user_id ?? null;
}

export async function getGithubSponsorship(
  db: D1Database,
  sponsorshipId: string,
): Promise<GithubSponsorshipState | null> {
  const row = await db.prepare(
    "SELECT sponsorship_id, github_sponsor_id, user_id, tier_id, tier_name, monthly_price_cents, is_one_time, privacy_level, status " +
    "FROM github_sponsorships WHERE sponsorship_id = ?",
  ).bind(sponsorshipId).first<any>();
  return row ? sponsorshipState(row) : null;
}

export async function getGithubSponsorshipBySponsorId(
  db: D1Database,
  githubSponsorId: number,
): Promise<GithubSponsorshipState | null> {
  const row = await db.prepare(
    "SELECT sponsorship_id, github_sponsor_id, user_id, tier_id, tier_name, monthly_price_cents, is_one_time, privacy_level, status " +
    "FROM github_sponsorships " +
    "WHERE github_sponsor_id = ? ORDER BY updated_at DESC LIMIT 1",
  ).bind(githubSponsorId).first<any>();
  return row ? sponsorshipState(row) : null;
}

export async function linkGithubSponsorshipToUser(
  db: D1Database,
  sponsorshipId: string,
  userId: number,
): Promise<void> {
  await db.prepare("UPDATE github_sponsorships SET user_id = ? WHERE sponsorship_id = ?")
    .bind(userId, sponsorshipId).run();
}

export async function getAiUsage(db: D1Database, userId: number, feature: string, period: string): Promise<number> {
  const row = await db.prepare("SELECT used FROM ai_usage WHERE user_id = ? AND feature = ? AND period = ?")
    .bind(userId, feature, period).first<{ used: number }>();
  return row?.used ?? 0;
}

export async function reserveAiUse(
  db: D1Database, userId: number, feature: string, period: string, limit: number, now: number,
): Promise<number | null> {
  const row = await db.prepare(
    "INSERT INTO ai_usage (user_id, feature, period, used, updated_at) VALUES (?, ?, ?, 1, ?) " +
    "ON CONFLICT(user_id, feature, period) DO UPDATE SET used = ai_usage.used + 1, updated_at = excluded.updated_at " +
    "WHERE ai_usage.used < ? RETURNING used",
  ).bind(userId, feature, period, now, limit).first<{ used: number }>();
  return row?.used ?? null;
}

export async function releaseAiUse(
  db: D1Database, userId: number, feature: string, period: string, now: number,
): Promise<void> {
  await db.prepare(
    "UPDATE ai_usage SET used = CASE WHEN used > 0 THEN used - 1 ELSE 0 END, updated_at = ? " +
    "WHERE user_id = ? AND feature = ? AND period = ?",
  ).bind(now, userId, feature, period).run();
}

export async function getProgress(db: D1Database, userId: number): Promise<string | null> {
  const row = await db.prepare("SELECT data FROM progress WHERE user_id = ?").bind(userId).first<{ data: string }>();
  return row?.data ?? null;
}

export async function putProgress(db: D1Database, userId: number, data: string, updatedAt: number): Promise<void> {
  await db.prepare(
    "INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?) " +
    "ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
  ).bind(userId, data, updatedAt).run();
}

const NICK_RE = /^[\p{L}\p{N} _.\-]{2,32}$/u;
export function validateNickname(raw: string): { ok: boolean; value: string } {
  const value = (raw ?? "").trim();
  return { ok: NICK_RE.test(value), value };
}
