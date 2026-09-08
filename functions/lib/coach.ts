/// <reference types="@cloudflare/workers-types" />
import type { Env } from "./types";
import {
  getEntitlementState,
  getGithubSponsorship,
  getGithubSponsorshipBySponsorId,
  grantEntitlementIfSponsorshipActive,
  linkGithubSponsorshipToUser,
  markEntitlementVerified,
  revokeEntitlementIfSource,
  setEntitlement,
  upsertGithubSponsorship,
} from "./db";
import { fetchViewerSponsorship, type GithubViewerSponsorship } from "./github";

export const COACH_ENTITLEMENT = "coach";
export const COACH_AI_FEATURE = "practice-grade";
const DEFAULT_MONTHLY_REQUESTS = 30;
const MAX_MONTHLY_REQUESTS = 1000;
export const COACH_VERIFICATION_MAX_AGE_MS = 5 * 60 * 1000;
export type CoachVerification = "verified" | "unavailable" | "reauth_required";
export interface CoachAccess { state: CoachVerification; coach: boolean; verifiedAt: number | null; }

export interface CoachConfig {
  billingConfigured: boolean;
  sponsorUrl: string | null;
  sponsorableLogin: string | null;
  coachTierIds: Set<string>;
  managedAiAvailable: boolean;
  managedAiModel: string;
  monthlyRequests: number;
}

export function normalizeGithubSponsorsUrl(raw: string | undefined): { url: string; login: string } | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== "github.com" ||
      url.port || url.username || url.password || url.search || url.hash ||
      parts.length !== 2 || parts[0] !== "sponsors" || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(parts[1])
    ) return null;
    return { url: `https://github.com/sponsors/${parts[1]}`, login: parts[1] };
  } catch {
    return null;
  }
}

export function parseTierIds(raw: string | undefined): Set<string> {
  return new Set((raw ?? "").split(",").map((v) => v.trim()).filter((v) => /^[A-Za-z0-9_=-]{4,128}$/.test(v)));
}

export function coachConfig(env: Env): CoachConfig {
  const sponsor = normalizeGithubSponsorsUrl(env.GITHUB_SPONSORS_URL);
  const coachTierIds = parseTierIds(env.GITHUB_SPONSORS_COACH_TIER_IDS);
  const requested = Number.parseInt(env.COACH_AI_MONTHLY_REQUESTS ?? "", 10);
  const monthlyRequests = Number.isFinite(requested)
    ? Math.min(MAX_MONTHLY_REQUESTS, Math.max(1, requested))
    : DEFAULT_MONTHLY_REQUESTS;
  const webhookSecret = env.GITHUB_SPONSORS_WEBHOOK_SECRET?.trim() ?? "";
  return {
    billingConfigured: Boolean(sponsor && webhookSecret && coachTierIds.size > 0),
    sponsorUrl: sponsor?.url ?? null,
    sponsorableLogin: sponsor?.login ?? null,
    coachTierIds,
    managedAiAvailable: Boolean(env.ANTHROPIC_API_KEY?.trim()),
    managedAiModel: env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001",
    monthlyRequests,
  };
}

export function utcMonthPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nextUtcMonthIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

export function coachTierQualifies(tier: { node_id?: unknown; is_one_time?: unknown }, cfg: CoachConfig): boolean {
  return tier.is_one_time === false && typeof tier.node_id === "string" && cfg.coachTierIds.has(tier.node_id);
}

export async function resolveCoachAccess(
  db: D1Database,
  cfg: CoachConfig,
  userId: number,
  githubAccessToken: string | undefined,
  forceRefresh = false,
  now = Date.now(),
): Promise<CoachAccess> {
  const stored = await getEntitlementState(db, userId, COACH_ENTITLEMENT);
  if (!forceRefresh && stored?.verifiedAt != null && now - stored.verifiedAt <= COACH_VERIFICATION_MAX_AGE_MS) {
    return { state: "verified", coach: stored.active, verifiedAt: stored.verifiedAt };
  }
  if (!cfg.billingConfigured || !cfg.sponsorableLogin) {
    return { state: "unavailable", coach: false, verifiedAt: stored?.verifiedAt ?? null };
  }
  if (!githubAccessToken) return { state: "reauth_required", coach: false, verifiedAt: stored?.verifiedAt ?? null };
  let live: GithubViewerSponsorship | null;
  try {
    live = await fetchViewerSponsorship(githubAccessToken, cfg.sponsorableLogin);
  } catch (err) {
    return {
      state: err instanceof Error && err.message === "github_reauth_required" ? "reauth_required" : "unavailable",
      coach: false,
      verifiedAt: stored?.verifiedAt ?? null,
    };
  }
  const user = await db.prepare("SELECT github_id FROM users WHERE id = ?").bind(userId).first<{ github_id: number }>();
  if (!user) return { state: "unavailable", coach: false, verifiedAt: null };
  await reconcileVerifiedGithubSponsorOnLogin(db, user.github_id, userId, cfg, live, now);
  const reconciled = await getEntitlementState(db, userId, COACH_ENTITLEMENT);
  const ownsVerifiedState = reconciled?.source === "github-sponsors" &&
    reconciled.sourceRef === live?.sponsorshipId && reconciled.verifiedAt === now;
  return { state: "verified", coach: Boolean(reconciled?.active && ownsVerifiedState), verifiedAt: reconciled?.verifiedAt ?? null };
}

export async function readBodyBounded(
  source: { headers: Headers; body: ReadableStream<Uint8Array> | null },
  maxBytes: number,
): Promise<ArrayBuffer | null> {
  const declared = Number(source.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!source.body) return new ArrayBuffer(0);

  const reader = source.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

export async function sha256Hex(raw: ArrayBuffer): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", raw)));
}

export async function reconcileGithubSponsorOnLogin(
  db: D1Database,
  githubSponsorId: number,
  userId: number,
  cfg: CoachConfig,
  now = Date.now(),
): Promise<void> {
  const sponsorship = await getGithubSponsorshipBySponsorId(db, githubSponsorId);
  if (!sponsorship) return;
  await linkGithubSponsorshipToUser(db, sponsorship.sponsorshipId, userId);
  if (cfg.coachTierIds.size === 0) return;
  const qualifies = sponsorship.status !== "cancelled" && coachTierQualifies({
    node_id: sponsorship.tierId,
    is_one_time: sponsorship.isOneTime,
  }, cfg);
  if (qualifies) {
    await grantEntitlementIfSponsorshipActive(
      db, userId, COACH_ENTITLEMENT, "github-sponsors", sponsorship.sponsorshipId,
      sponsorship.tierId, sponsorship.isOneTime, now,
    );
  } else {
    // Login reconciliation must not let an old/non-qualifying sponsorship
    // revoke access that is currently owned by a different sponsorship/source.
    await revokeEntitlementIfSource(
      db, userId, COACH_ENTITLEMENT, "github-sponsors", sponsorship.sponsorshipId, now,
    );
  }
}

export async function reconcileVerifiedGithubSponsorOnLogin(
  db: D1Database,
  githubSponsorId: number,
  userId: number,
  cfg: CoachConfig,
  live: GithubViewerSponsorship | null,
  now = Date.now(),
): Promise<void> {
  if (!live) {
    // The OAuth viewer is the sponsor, so a null active sponsorship is
    // authoritative for this account. Revoke only the source that belongs to
    // this sponsor; never touch another entitlement source.
    const existing = await getGithubSponsorshipBySponsorId(db, githubSponsorId);
    if (!existing) {
      await setEntitlement(db, userId, COACH_ENTITLEMENT, false, "github-sponsors", null, now, now);
      return;
    }
    await linkGithubSponsorshipToUser(db, existing.sponsorshipId, userId);
    await revokeEntitlementIfSource(
      db, userId, COACH_ENTITLEMENT, "github-sponsors", existing.sponsorshipId, now,
    );
    await markEntitlementVerified(db, userId, COACH_ENTITLEMENT, now, "github-sponsors", existing.sponsorshipId);
    return;
  }

  const existingLive = await getGithubSponsorship(db, live.sponsorshipId);
  if (existingLive?.status === "cancelled") {
    await markEntitlementVerified(db, userId, COACH_ENTITLEMENT, now, "github-sponsors", live.sponsorshipId);
    return;
  }

  await upsertGithubSponsorship(db, {
    sponsorshipId: live.sponsorshipId,
    githubSponsorId,
    userId,
    tierId: live.tierId,
    tierName: live.tierName,
    monthlyPriceCents: live.monthlyPriceCents,
    isOneTime: live.isOneTime,
    privacyLevel: live.privacyLevel,
    status: "verified",
    updatedAt: now,
  });

  const qualifies = coachTierQualifies({ node_id: live.tierId, is_one_time: live.isOneTime }, cfg);
  if (qualifies) {
    const granted = await grantEntitlementIfSponsorshipActive(
      db, userId, COACH_ENTITLEMENT, "github-sponsors", live.sponsorshipId,
      live.tierId, live.isOneTime, now,
    );
    if (granted) {
      await markEntitlementVerified(db, userId, COACH_ENTITLEMENT, now, "github-sponsors", live.sponsorshipId);
    }
  } else {
    await revokeEntitlementIfSource(
      db, userId, COACH_ENTITLEMENT, "github-sponsors", live.sponsorshipId, now,
    );
  }
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyGithubWebhookSignature(raw: ArrayBuffer, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !/^sha256=[0-9a-f]{64}$/i.test(signature) || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, raw));
  return constantTimeEqual(`sha256=${bytesToHex(digest)}`, signature.toLowerCase());
}
