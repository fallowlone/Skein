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

export interface PaymentRow {
  id: number;
  userId: number;
  provider: string;
  providerPaymentId: string;
  product: string;
  amount: number;
  currency: string;
  status: string;
  orderId: string | null;
  telegramUserId: string | null;
  subscriptionExpiresAt: number | null;
  isRecurring: boolean;
  isFirstRecurring: boolean;
  refundedAt: number | null;
  createdAt: number;
}

export async function getPaymentByProviderId(db: D1Database, provider: string, id: string): Promise<PaymentRow | null> {
  const row = await db.prepare(
    "SELECT id, user_id, provider, provider_payment_id, product, amount, currency, status, order_id, telegram_user_id, " +
    "subscription_expires_at, is_recurring, is_first_recurring, refunded_at, created_at " +
    "FROM payments WHERE provider = ? AND provider_payment_id = ?",
  ).bind(provider, id).first<any>();
  return row ? {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerPaymentId: row.provider_payment_id,
    product: row.product,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    orderId: row.order_id ?? null,
    telegramUserId: row.telegram_user_id ?? null,
    subscriptionExpiresAt: row.subscription_expires_at ?? null,
    isRecurring: row.is_recurring === 1,
    isFirstRecurring: row.is_first_recurring === 1,
    refundedAt: row.refunded_at ?? null,
    createdAt: row.created_at,
  } : null;
}

export async function createPayment(db: D1Database, row: Omit<PaymentRow, "id">, now: number): Promise<void> {
  await db.prepare(
    "INSERT INTO payments (user_id, provider, provider_payment_id, product, amount, currency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(row.userId, row.provider, row.providerPaymentId, row.product, row.amount, row.currency, row.status, now, now).run();
}

export async function updatePaymentStatus(db: D1Database, provider: string, providerPaymentId: string, status: string, now: number): Promise<void> {
  await db.prepare("UPDATE payments SET status = ?, updated_at = ? WHERE provider = ? AND provider_payment_id = ?")
    .bind(status, now, provider, providerPaymentId).run();
}

export interface TelegramOrderRow {
  id: string;
  userId: number;
  product: string;
  amount: number;
  currency: string;
  billingKind: string;
  subscriptionPeriodSeconds: number | null;
  status: string;
  telegramUserId: string | null;
  checkoutExpiresAt: number;
  currentPeriodEnd: number | null;
  createdAt: number;
  updatedAt: number;
}

function telegramOrderRow(row: any): TelegramOrderRow {
  return {
    id: row.id,
    userId: row.user_id,
    product: row.product,
    amount: row.amount,
    currency: row.currency,
    billingKind: row.billing_kind,
    subscriptionPeriodSeconds: row.subscription_period_seconds ?? null,
    status: row.status,
    telegramUserId: row.telegram_user_id ?? null,
    checkoutExpiresAt: row.checkout_expires_at,
    currentPeriodEnd: row.current_period_end ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function telegramSchemaReady(db: D1Database): Promise<boolean> {
  const row = await db.prepare(
    "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN ('payments', 'telegram_orders', 'telegram_entitlements')",
  ).bind().first<{ count: number }>();
  if (row?.count !== 3) return false;
  const preCheckout = await db.prepare(
    "SELECT COUNT(*) AS count FROM pragma_table_info('telegram_orders') WHERE name = 'pre_checkout_query_id'",
  ).bind().first<{ count: number }>();
  if (preCheckout?.count !== 1) return false;
  const preCheckoutIndex = await db.prepare(
    "SELECT COUNT(*) AS count FROM pragma_index_list('telegram_orders') " +
    "WHERE name = 'idx_telegram_orders_pre_checkout_query' AND \"unique\" = 1 AND partial = 1",
  ).bind().first<{ count: number }>();
  return preCheckoutIndex?.count === 1;
}

export async function createTelegramOrder(
  db: D1Database,
  row: {
    id: string;
    userId: number;
    product: string;
    amount: number;
    currency: string;
    billingKind: string;
    subscriptionPeriodSeconds: number | null;
    checkoutExpiresAt: number;
  },
  now: number,
): Promise<void> {
  await db.prepare(
    "INSERT INTO telegram_orders " +
    "(id, user_id, product, amount, currency, billing_kind, subscription_period_seconds, status, checkout_expires_at, created_at, updated_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, 'created', ?, ?, ?)",
  ).bind(
    row.id, row.userId, row.product, row.amount, row.currency, row.billingKind,
    row.subscriptionPeriodSeconds, row.checkoutExpiresAt, now, now,
  ).run();
}

export async function getTelegramOrder(db: D1Database, id: string): Promise<TelegramOrderRow | null> {
  const row = await db.prepare(
    "SELECT id, user_id, product, amount, currency, billing_kind, subscription_period_seconds, status, telegram_user_id, " +
    "checkout_expires_at, current_period_end, created_at, updated_at FROM telegram_orders WHERE id = ?",
  ).bind(id).first<any>();
  return row ? telegramOrderRow(row) : null;
}

export async function markTelegramOrderInvoiceReady(db: D1Database, id: string, now: number): Promise<void> {
  await db.prepare("UPDATE telegram_orders SET status = 'invoice_ready', updated_at = ? WHERE id = ? AND status = 'created'")
    .bind(now, id).run();
}

export async function markTelegramOrderFailed(db: D1Database, id: string, now: number): Promise<void> {
  await db.prepare("UPDATE telegram_orders SET status = 'failed', updated_at = ? WHERE id = ? AND status IN ('created', 'invoice_ready')")
    .bind(now, id).run();
}

export async function approveTelegramPreCheckout(
  db: D1Database,
  input: {
    orderId: string;
    product: string;
    amount: number;
    currency: string;
    telegramUserId: string;
    preCheckoutQueryId: string;
  },
  now: number,
): Promise<boolean> {
  const result = await db.prepare(
    "UPDATE telegram_orders SET telegram_user_id = COALESCE(telegram_user_id, ?), " +
    "pre_checkout_query_id = COALESCE(pre_checkout_query_id, ?), status = 'approved', updated_at = ? " +
    "WHERE id = ? AND product = ? AND amount = ? AND currency = ? AND checkout_expires_at >= ? " +
    "AND status IN ('created', 'invoice_ready', 'approved') AND (telegram_user_id IS NULL OR telegram_user_id = ?) " +
    "AND (pre_checkout_query_id IS NULL OR pre_checkout_query_id = ?)",
  ).bind(
    input.telegramUserId, input.preCheckoutQueryId, now,
    input.orderId, input.product, input.amount, input.currency, now,
    input.telegramUserId, input.preCheckoutQueryId,
  ).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getTelegramPaymentCountForOrder(db: D1Database, orderId: string): Promise<number> {
  const row = await db.prepare(
    "SELECT COUNT(*) AS count FROM payments WHERE provider = 'telegram_stars' AND order_id = ?",
  ).bind(orderId).first<{ count: number }>();
  return row?.count ?? 0;
}

export async function recordTelegramSubscriptionPayment(
  db: D1Database,
  input: {
    order: TelegramOrderRow;
    providerPaymentId: string;
    telegramUserId: string;
    product: string;
    amount: number;
    currency: string;
    subscriptionExpiresAt: number;
    isFirstRecurring: boolean;
    entitlements: string[];
  },
  now: number,
): Promise<void> {
  const statements = [
    db.prepare(
      "INSERT INTO payments " +
      "(user_id, provider, provider_payment_id, product, amount, currency, status, created_at, updated_at, processed_at, order_id, " +
      "telegram_user_id, subscription_expires_at, is_recurring, is_first_recurring) " +
      "VALUES (?, 'telegram_stars', ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, 1, ?)",
    ).bind(
      input.order.userId, input.providerPaymentId, input.product, input.amount, input.currency,
      now, now, now, input.order.id, input.telegramUserId, input.subscriptionExpiresAt, input.isFirstRecurring ? 1 : 0,
    ),
    db.prepare(
      "UPDATE telegram_orders SET status = CASE WHEN status = 'pending_cancellation' THEN 'pending_cancellation' ELSE 'active' END, " +
      "current_period_end = MAX(COALESCE(current_period_end, 0), ?), updated_at = ? " +
      "WHERE id = ? AND telegram_user_id = ? AND status IN ('approved', 'active', 'pending_cancellation', 'refunded', 'expired')",
    ).bind(input.subscriptionExpiresAt, now, input.order.id, input.telegramUserId),
    ...input.entitlements.map((entitlement) => db.prepare(
      "INSERT INTO telegram_entitlements (order_id, user_id, entitlement, active, expires_at, granted_at, updated_at) " +
      "VALUES (?, ?, ?, 1, ?, ?, ?) ON CONFLICT(user_id, entitlement, order_id) DO UPDATE SET " +
      "active = 1, expires_at = MAX(telegram_entitlements.expires_at, excluded.expires_at), updated_at = excluded.updated_at",
    ).bind(input.order.id, input.order.userId, entitlement, input.subscriptionExpiresAt, now, now)),
  ];
  await db.batch(statements);
}

export async function recordTelegramOneTimePayment(
  db: D1Database,
  input: {
    order: TelegramOrderRow;
    providerPaymentId: string;
    telegramUserId: string;
    product: string;
    amount: number;
    currency: string;
  },
  now: number,
): Promise<void> {
  const results = await db.batch([
    db.prepare(
      "INSERT INTO payments " +
      "(user_id, provider, provider_payment_id, product, amount, currency, status, created_at, updated_at, processed_at, order_id, " +
      "telegram_user_id, subscription_expires_at, is_recurring, is_first_recurring) " +
      "SELECT user_id, 'telegram_stars', ?, product, amount, currency, 'completed', ?, ?, ?, id, telegram_user_id, NULL, 0, 0 " +
      "FROM telegram_orders WHERE id = ? AND user_id = ? AND product = ? AND amount = ? AND currency = ? " +
      "AND billing_kind = 'one_time' AND subscription_period_seconds IS NULL AND telegram_user_id = ? AND status = 'approved'",
    ).bind(
      input.providerPaymentId, now, now, now, input.order.id, input.order.userId,
      input.product, input.amount, input.currency, input.telegramUserId,
    ),
    db.prepare(
      "UPDATE telegram_orders SET status = 'completed', updated_at = ? " +
      "WHERE id = ? AND telegram_user_id = ? AND status = 'approved' " +
      "AND EXISTS (SELECT 1 FROM payments WHERE provider = 'telegram_stars' AND provider_payment_id = ? AND order_id = ?)",
    ).bind(now, input.order.id, input.telegramUserId, input.providerPaymentId, input.order.id),
  ]);
  if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1) {
    throw new Error("telegram_one_time_payment_not_recorded");
  }
}

export async function refundTelegramPayment(
  db: D1Database,
  payment: PaymentRow,
  now: number,
): Promise<void> {
  if (!payment.orderId) throw new Error("telegram_payment_missing_order");
  const maxPaidThrough = "COALESCE((SELECT MAX(subscription_expires_at) FROM payments " +
    "WHERE provider = 'telegram_stars' AND order_id = ? AND status = 'completed' AND refunded_at IS NULL), 0)";
  await db.batch([
    db.prepare(
      "UPDATE payments SET status = 'refunded', refunded_at = ?, updated_at = ? " +
      "WHERE provider = 'telegram_stars' AND provider_payment_id = ? AND status <> 'refunded'",
    ).bind(now, now, payment.providerPaymentId),
    db.prepare(
      `UPDATE telegram_orders SET current_period_end = ${maxPaidThrough}, ` +
      `status = CASE WHEN ${maxPaidThrough} > ? THEN CASE WHEN status = 'pending_cancellation' THEN 'pending_cancellation' ELSE 'active' END ELSE 'refunded' END, ` +
      "updated_at = ? WHERE id = ?",
    ).bind(payment.orderId, payment.orderId, now, now, payment.orderId),
    db.prepare(
      `UPDATE telegram_entitlements SET expires_at = CASE WHEN ${maxPaidThrough} > 0 THEN ${maxPaidThrough} ELSE expires_at END, ` +
      `active = CASE WHEN ${maxPaidThrough} > ? THEN 1 ELSE 0 END, updated_at = ? WHERE order_id = ?`,
    ).bind(payment.orderId, payment.orderId, payment.orderId, now, now, payment.orderId),
  ]);
}

export async function refundTelegramOneTimePayment(
  db: D1Database,
  payment: PaymentRow,
  now: number,
): Promise<void> {
  if (!payment.orderId) throw new Error("telegram_payment_missing_order");
  const results = await db.batch([
    db.prepare(
      "UPDATE payments SET status = 'refunded', refunded_at = ?, updated_at = ? " +
      "WHERE provider = 'telegram_stars' AND provider_payment_id = ? AND order_id = ? AND status = 'completed' " +
      "AND is_recurring = 0 AND subscription_expires_at IS NULL",
    ).bind(now, now, payment.providerPaymentId, payment.orderId),
    db.prepare(
      "UPDATE telegram_orders SET status = 'refunded', updated_at = ? " +
      "WHERE id = ? AND billing_kind = 'one_time' AND status = 'completed' " +
      "AND EXISTS (SELECT 1 FROM payments WHERE provider = 'telegram_stars' AND provider_payment_id = ? " +
      "AND order_id = ? AND status = 'refunded')",
    ).bind(now, payment.orderId, payment.providerPaymentId, payment.orderId),
  ]);
  if ((results[0]?.meta?.changes ?? 0) !== 1 || (results[1]?.meta?.changes ?? 0) !== 1) {
    throw new Error("telegram_one_time_refund_not_recorded");
  }
}

export interface TelegramEntitlementState {
  orderId: string;
  expiresAt: number;
  renewalStatus: string;
}

export async function getActiveTelegramEntitlement(
  db: D1Database,
  userId: number,
  entitlement: string,
  now: number,
): Promise<TelegramEntitlementState | null> {
  if (!(await telegramSchemaReady(db))) return null;
  await db.batch([
    db.prepare(
      "UPDATE telegram_entitlements SET active = 0, updated_at = ? WHERE user_id = ? AND active = 1 AND expires_at <= ?",
    ).bind(now, userId, now),
    db.prepare(
      "UPDATE telegram_orders SET status = 'expired', updated_at = ? WHERE user_id = ? AND status IN ('active', 'pending_cancellation') " +
      "AND current_period_end IS NOT NULL AND current_period_end <= ?",
    ).bind(now, userId, now),
  ]);
  const row = await db.prepare(
    "SELECT te.order_id, te.expires_at, o.status FROM telegram_entitlements te " +
    "JOIN telegram_orders o ON o.id = te.order_id " +
    "WHERE te.user_id = ? AND te.entitlement = ? AND te.active = 1 AND te.expires_at > ? " +
    "ORDER BY te.expires_at DESC LIMIT 1",
  ).bind(userId, entitlement, now).first<{ order_id: string; expires_at: number; status: string }>();
  return row ? { orderId: row.order_id, expiresAt: row.expires_at, renewalStatus: row.status } : null;
}

export interface TelegramSubscriptionControl {
  orderId: string;
  telegramUserId: string;
  providerPaymentId: string;
  expiresAt: number;
  status: string;
}

export async function getTelegramSubscriptionControl(
  db: D1Database,
  userId: number,
  now: number,
): Promise<TelegramSubscriptionControl | null> {
  const row = await db.prepare(
    "SELECT o.id AS order_id, o.telegram_user_id, o.status, te.expires_at, p.provider_payment_id " +
    "FROM telegram_orders o " +
    "JOIN telegram_entitlements te ON te.order_id = o.id AND te.user_id = o.user_id AND te.entitlement = 'coach' " +
    "JOIN payments p ON p.order_id = o.id AND p.provider = 'telegram_stars' AND p.is_first_recurring = 1 " +
    "WHERE o.user_id = ? AND te.active = 1 AND te.expires_at > ? AND o.telegram_user_id IS NOT NULL " +
    "ORDER BY te.expires_at DESC, p.created_at ASC LIMIT 1",
  ).bind(userId, now).first<any>();
  return row ? {
    orderId: row.order_id,
    telegramUserId: row.telegram_user_id,
    providerPaymentId: row.provider_payment_id,
    expiresAt: row.expires_at,
    status: row.status,
  } : null;
}

export async function setTelegramSubscriptionRenewalState(
  db: D1Database,
  orderId: string,
  canceled: boolean,
  now: number,
): Promise<void> {
  await db.prepare(
    "UPDATE telegram_orders SET status = ?, updated_at = ? WHERE id = ? AND status IN ('active', 'pending_cancellation')",
  ).bind(canceled ? "pending_cancellation" : "active", now, orderId).run();
}

export async function applyTelegramSubscriptionProviderState(
  db: D1Database,
  orderId: string,
  telegramUserId: string,
  state: "canceled" | "active" | "failed",
  now: number,
): Promise<boolean> {
  const status = state === "canceled" ? "pending_cancellation" : state === "active" ? "active" : "payment_failed";
  const result = await db.prepare(
    "UPDATE telegram_orders SET status = ?, updated_at = ? " +
    "WHERE id = ? AND billing_kind = 'subscription' AND telegram_user_id = ? " +
    "AND status IN ('active', 'pending_cancellation', 'payment_failed')",
  ).bind(status, now, orderId, telegramUserId).run();
  return (result.meta.changes ?? 0) > 0;
}

export interface PaymentHistoryRow {
  provider: string;
  product: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: number;
  subscriptionExpiresAt: number | null;
}

export async function listPaymentsForUser(db: D1Database, userId: number, limit = 25): Promise<PaymentHistoryRow[]> {
  const result = await db.prepare(
    "SELECT provider, product, amount, currency, status, created_at, subscription_expires_at FROM payments " +
    "WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
  ).bind(userId, limit).all<any>();
  return (result.results ?? []).map((row: any) => ({
    provider: row.provider,
    product: row.product,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
    subscriptionExpiresAt: row.subscription_expires_at ?? null,
  }));
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
