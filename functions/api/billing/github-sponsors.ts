/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import {
  getGithubSponsorship,
  getUserByGithubId,
  grantEntitlementIfSponsorshipActive,
  hasBillingDelivery,
  recordBillingDelivery,
  revokeEntitlementIfSource,
  upsertGithubSponsorship,
} from "../../lib/db";
import {
  COACH_ENTITLEMENT,
  coachConfig,
  coachTierQualifies,
  readBodyBounded,
  sha256Hex,
  verifyGithubWebhookSignature,
} from "../../lib/coach";
import { error, json } from "../../lib/response";

type SponsorUser = { id?: unknown; login?: unknown; type?: unknown };
type SponsorTier = {
  node_id?: unknown;
  name?: unknown;
  monthly_price_in_cents?: unknown;
  is_one_time?: unknown;
};
type Sponsorship = {
  node_id?: unknown;
  sponsor?: SponsorUser | null;
  sponsorable?: { login?: unknown } | null;
  privacy_level?: unknown;
  tier?: SponsorTier | null;
};
type Payload = {
  action?: unknown;
  sponsorship?: Sponsorship | null;
  changes?: { tier?: { from?: SponsorTier | null } | null } | null;
};

const ACTIONS = new Set([
  "created", "edited", "pending_cancellation", "cancelled", "pending_tier_change", "tier_changed",
]);

function asString(v: unknown, max = 256): string | null {
  return typeof v === "string" && v.length > 0 && v.length <= max ? v : null;
}

function asNonNegativeInt(v: unknown): number | null {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseTier(tier: SponsorTier | null | undefined) {
  const tierId = asString(tier?.node_id, 128);
  const tierName = asString(tier?.name, 128);
  const monthlyPriceCents = asNonNegativeInt(tier?.monthly_price_in_cents);
  const isOneTime = tier?.is_one_time;
  return tierId && tierName && monthlyPriceCents != null && typeof isOneTime === "boolean"
    ? { tierId, tierName, monthlyPriceCents, isOneTime }
    : null;
}

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const cfg = coachConfig(ctx.env);
  const secret = ctx.env.GITHUB_SPONSORS_WEBHOOK_SECRET?.trim() ?? "";
  if (!cfg.sponsorUrl || !secret || !cfg.sponsorableLogin ||
    (cfg.coachTierIds.size === 0 && !ctx.env.GITHUB_SPONSORS_COURSE_TIER_ID)) return error(503, "billing_unavailable");

  if (ctx.request.headers.get("X-GitHub-Event") !== "sponsorship") return error(400, "wrong_event");
  const deliveryId = ctx.request.headers.get("X-GitHub-Delivery")?.trim();
  if (!deliveryId || deliveryId.length > 128) return error(400, "bad_delivery_id");

  const raw = await readBodyBounded(ctx.request, 128 * 1024);
  if (!raw || raw.byteLength === 0) return error(413, "bad_payload_size");
  const valid = await verifyGithubWebhookSignature(
    raw,
    ctx.request.headers.get("X-Hub-Signature-256"),
    secret,
  );
  if (!valid) return error(401, "bad_signature");
  const payloadHash = await sha256Hex(raw);

  if (await hasBillingDelivery(ctx.env.DB, deliveryId, payloadHash)) {
    return json({ ok: true, duplicate: true });
  }

  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(raw)); }
  catch { return error(400, "bad_json"); }
  if (!isObject(parsed)) return error(400, "bad_sponsorship");
  const payload = parsed as Payload;

  const action = asString(payload.action, 40);
  const sponsorship = payload.sponsorship;
  if (!action || !ACTIONS.has(action) || !sponsorship) return error(400, "bad_sponsorship");

  const sponsorshipId = asString(sponsorship.node_id, 128);
  const currentTier = parseTier(sponsorship.tier);
  const privacyLevel = asString(sponsorship.privacy_level, 32);
  const sponsorableLogin = asString(sponsorship.sponsorable?.login, 64);
  if (
    !sponsorshipId || !currentTier || !privacyLevel || !sponsorableLogin ||
    sponsorableLogin.toLowerCase() !== cfg.sponsorableLogin.toLowerCase()
  ) return error(400, "bad_sponsorship");

  if (currentTier.tierId === ctx.env.GITHUB_SPONSORS_COURSE_TIER_ID) {
    if (!currentTier.isOneTime || currentTier.monthlyPriceCents !== 999) return error(400, "invalid_course_tier");
    if (action !== "created") {
      if (action === "cancelled") await ctx.env.DB.prepare(
        "UPDATE course_access_grants SET revoked_at = ? WHERE provider = 'github-sponsors' AND provider_ref = ? AND revoked_at IS NULL",
      ).bind(Date.now(), sponsorshipId).run();
      await recordBillingDelivery(ctx.env.DB, deliveryId, payloadHash, "sponsorship", action, Date.now());
      return json({ ok: true });
    }
    const sponsorId = asNonNegativeInt(sponsorship.sponsor?.id);
    const sponsorUser = sponsorId != null && sponsorship.sponsor?.type === "User"
      ? await getUserByGithubId(ctx.env.DB, sponsorId) : null;
    if (!sponsorUser) return error(409, "course_buyer_not_found");
    const prior = await ctx.env.DB.prepare(
      "SELECT 1 AS owned FROM course_access_grants WHERE provider = 'github-sponsors' AND provider_ref = ? LIMIT 1",
    ).bind(sponsorshipId).first<{ owned: number }>();
    if (prior) {
      await recordBillingDelivery(ctx.env.DB, deliveryId, payloadHash, "sponsorship", action, Date.now());
      return json({ ok: true, duplicate: true });
    }
    const now = Date.now();
    const intent = await ctx.env.DB.prepare(
      "SELECT track FROM course_purchase_intents WHERE user_id = ? AND consumed_at IS NULL AND expires_at > ?",
    ).bind(sponsorUser.id, now).first<{ track: string }>();
    if (!intent) return error(409, "course_checkout_not_found");
    const results = await ctx.env.DB.batch([
      ctx.env.DB.prepare(
        "UPDATE course_purchase_intents SET consumed_at = ? WHERE user_id = ? AND track = ? " +
        "AND consumed_at IS NULL AND expires_at > ?",
      ).bind(now, sponsorUser.id, intent.track, now),
      ctx.env.DB.prepare(
        "INSERT INTO course_access_grants (user_id, track, provider, provider_ref, expires_at, revoked_at) " +
        "SELECT user_id, track, 'github-sponsors', ?, NULL, NULL FROM course_purchase_intents " +
        "WHERE user_id = ? AND track = ? AND consumed_at = ?",
      ).bind(sponsorshipId, sponsorUser.id, intent.track, now),
    ]);
    if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1) {
      return error(503, "course_grant_failed");
    }
    await recordBillingDelivery(ctx.env.DB, deliveryId, payloadHash, "sponsorship", action, now);
    return json({ ok: true });
  }

  const existing = await getGithubSponsorship(ctx.env.DB, sponsorshipId);
  // Cancellation is terminal for one GitHub sponsorship node. Late deliveries
  // and captured signed payload replays must never resurrect paid access.
  if (existing?.status === "cancelled" && action !== "cancelled") {
    await recordBillingDelivery(ctx.env.DB, deliveryId, payloadHash, "sponsorship", action, Date.now());
    return json({ ok: true, stale: true });
  }
  // `created` is the beginning of this node's lifecycle. A later distinct
  // delivery with the same sponsorship id is stale even if GitHub changes the GUID.
  if (action === "created" && existing) {
    await recordBillingDelivery(ctx.env.DB, deliveryId, payloadHash, "sponsorship", action, Date.now());
    return json({ ok: true, stale: true });
  }

  const sponsorId = asNonNegativeInt(sponsorship.sponsor?.id);
  const sponsorType = asString(sponsorship.sponsor?.type, 32);
  const sponsorUser = sponsorId != null && sponsorType === "User"
    ? await getUserByGithubId(ctx.env.DB, sponsorId)
    : null;
  const userId = sponsorUser?.id ?? existing?.userId ?? null;
  const now = Date.now();

  let storedTier = currentTier;
  const previousTier = action === "tier_changed" ? parseTier(payload.changes?.tier?.from) : null;
  if (action === "tier_changed" && !previousTier) return error(400, "bad_sponsorship");
  if (existing && (action === "edited" || action === "pending_cancellation" || action === "pending_tier_change")) {
    storedTier = {
      tierId: existing.tierId,
      tierName: existing.tierName,
      monthlyPriceCents: existing.monthlyPriceCents,
      isOneTime: existing.isOneTime,
    };
  } else if (!existing && action === "pending_tier_change") {
    // During a pending tier change the sponsorship payload can describe the
    // future tier. Until `tier_changed`, the `from` tier remains authoritative.
    const from = parseTier(payload.changes?.tier?.from);
    if (!from) return error(400, "bad_sponsorship");
    storedTier = from;
  }

  await upsertGithubSponsorship(ctx.env.DB, {
    sponsorshipId,
    githubSponsorId: sponsorId ?? existing?.githubSponsorId ?? null,
    userId,
    tierId: storedTier.tierId,
    tierName: storedTier.tierName,
    monthlyPriceCents: storedTier.monthlyPriceCents,
    isOneTime: storedTier.isOneTime,
    privacyLevel,
    status: action,
    updatedAt: now,
    expectedTierId: previousTier?.tierId,
    expectedIsOneTime: previousTier?.isOneTime,
  });

  if (userId != null) {
    if (action === "cancelled") {
      // A delayed cancellation for an older sponsorship must not revoke a
      // newer sponsorship (or another future entitlement source) that has
      // since become authoritative for this learner.
      await revokeEntitlementIfSource(
        ctx.env.DB, userId, COACH_ENTITLEMENT, "github-sponsors", sponsorshipId, now,
      );
    } else if (action === "created" || action === "tier_changed" || action === "edited") {
      const qualifies = coachTierQualifies({ node_id: storedTier.tierId, is_one_time: storedTier.isOneTime }, cfg);
      if (qualifies) {
        await grantEntitlementIfSponsorshipActive(
          ctx.env.DB, userId, COACH_ENTITLEMENT, "github-sponsors", sponsorshipId,
          storedTier.tierId, storedTier.isOneTime, now,
        );
      } else {
        await revokeEntitlementIfSource(
          ctx.env.DB, userId, COACH_ENTITLEMENT, "github-sponsors", sponsorshipId, now,
        );
      }
    }
  }

  // Mark the delivery only after its idempotent state changes succeed. A failed
  // attempt remains retryable. Both the GitHub GUID and the signed-body hash
  // are deduped, so changing the unsigned delivery header cannot replay state.
  await recordBillingDelivery(ctx.env.DB, deliveryId, payloadHash, "sponsorship", action, now);

  return json({ ok: true });
};
