/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import {
  applyTelegramSubscriptionProviderState,
  approveTelegramPreCheckout,
  getPaymentByProviderId,
  getTelegramOrder,
  getTelegramPaymentCountForOrder,
  recordTelegramOneTimePayment,
  recordTelegramSubscriptionPayment,
  refundTelegramOneTimePayment,
  refundTelegramPayment,
} from "../../lib/db";
import { readBodyBounded } from "../../lib/coach";
import { PRODUCTS } from "../../lib/products";
import { error, json } from "../../lib/response";
import {
  answerTelegramPreCheckout,
  parseTelegramOrderPayload,
  telegramPaymentId,
  telegramSecretMatches,
  telegramUserId,
} from "../../lib/telegram";

function object(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : null;
}

function nonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

async function rejectPreCheckout(token: string, queryId: string, message: string): Promise<Response> {
  return await answerTelegramPreCheckout(token, queryId, false, message)
    ? json({ ok: true, accepted: false })
    : error(502, "telegram_unavailable");
}

async function handlePreCheckout(db: D1Database, token: string, value: unknown): Promise<Response> {
  const query = object(value);
  const queryId = telegramPaymentId(query?.id);
  if (!queryId) return error(400, "invalid_pre_checkout");
  const payerId = telegramUserId(object(query?.from)?.id);
  const orderId = parseTelegramOrderPayload(query?.invoice_payload);
  const amount = nonNegativeInt(query?.total_amount);
  const currency = typeof query?.currency === "string" ? query.currency : null;
  if (!payerId || !orderId || amount == null || !currency) {
    return rejectPreCheckout(token, queryId, "This Skein checkout is invalid or expired.");
  }

  const order = await getTelegramOrder(db, orderId);
  const product = order ? PRODUCTS[order.product] : null;
  const valid = Boolean(
    order && product &&
    order.product === product.id && order.amount === product.amount && order.currency === product.currency &&
    order.billingKind === product.billingKind && order.subscriptionPeriodSeconds === product.subscriptionPeriodSeconds &&
    amount === order.amount && currency === order.currency,
  );
  if (!valid) return rejectPreCheckout(token, queryId, "This Skein checkout is invalid or expired.");

  const approved = await approveTelegramPreCheckout(db, {
    orderId,
    product: product!.id,
    amount: product!.amount,
    currency: product!.currency,
    telegramUserId: payerId,
    preCheckoutQueryId: queryId,
  }, Date.now());
  if (!approved) return rejectPreCheckout(token, queryId, "This Skein checkout is no longer available.");
  return await answerTelegramPreCheckout(token, queryId, true)
    ? json({ ok: true, accepted: true })
    : error(502, "telegram_unavailable");
}

async function handleSuccessfulPayment(db: D1Database, message: Record<string, any>, value: unknown): Promise<Response> {
  const payment = object(value);
  const orderId = parseTelegramOrderPayload(payment?.invoice_payload);
  const providerPaymentId = telegramPaymentId(payment?.telegram_payment_charge_id);
  const payerId = telegramUserId(object(message.from)?.id);
  const amount = nonNegativeInt(payment?.total_amount);
  const currency = typeof payment?.currency === "string" ? payment.currency : null;
  if (!orderId || !providerPaymentId || !payerId || amount == null || !currency) return error(400, "invalid_payment");

  const existing = await getPaymentByProviderId(db, "telegram_stars", providerPaymentId);
  if (existing) {
    const samePayment = existing.orderId === orderId && existing.telegramUserId === payerId &&
      existing.amount === amount && existing.currency === currency;
    return samePayment ? json({ ok: true, duplicate: true }) : error(409, "payment_id_conflict");
  }

  const order = await getTelegramOrder(db, orderId);
  const product = order ? PRODUCTS[order.product] : null;
  if (
    !order || !product || order.telegramUserId !== payerId ||
    order.product !== product.id || order.amount !== product.amount || order.currency !== product.currency ||
    order.billingKind !== product.billingKind || order.subscriptionPeriodSeconds !== product.subscriptionPeriodSeconds ||
    amount !== order.amount || currency !== order.currency
  ) return error(400, "invalid_payment");

  if (product.billingKind === "one_time") {
    if (
      payment?.is_recurring === true || payment?.is_first_recurring === true ||
      payment?.subscription_expiration_date != null || product.entitlements.length !== 0
    ) return error(400, "invalid_payment");
    if (await getTelegramPaymentCountForOrder(db, order.id) !== 0) return error(409, "order_already_paid");
    try {
      await recordTelegramOneTimePayment(db, {
        order,
        providerPaymentId,
        telegramUserId: payerId,
        product: product.id,
        amount,
        currency,
      }, Date.now());
    } catch {
      const raced = await getPaymentByProviderId(db, "telegram_stars", providerPaymentId).catch(() => null);
      if (
        raced?.orderId === orderId && raced.telegramUserId === payerId &&
        raced.amount === amount && raced.currency === currency
      ) return json({ ok: true, duplicate: true });
      return error(503, "payment_persistence_failed");
    }
    return json({ ok: true });
  }

  if (payment?.is_recurring !== true) return error(400, "invalid_payment");

  const expirationSeconds = nonNegativeInt(payment?.subscription_expiration_date);
  const subscriptionExpiresAt = expirationSeconds == null ? null : expirationSeconds * 1000;
  if (!subscriptionExpiresAt || subscriptionExpiresAt <= Date.now()) return error(400, "invalid_subscription");

  const priorPayments = await getTelegramPaymentCountForOrder(db, order.id);
  const isFirstRecurring = payment?.is_first_recurring === true;
  if ((priorPayments === 0) !== isFirstRecurring) return error(400, "invalid_subscription_sequence");

  try {
    await recordTelegramSubscriptionPayment(db, {
      order,
      providerPaymentId,
      telegramUserId: payerId,
      product: product.id,
      amount,
      currency,
      subscriptionExpiresAt,
      isFirstRecurring,
      entitlements: product.entitlements,
    }, Date.now());
  } catch {
    const raced = await getPaymentByProviderId(db, "telegram_stars", providerPaymentId).catch(() => null);
    if (
      raced?.orderId === orderId && raced.telegramUserId === payerId &&
      raced.amount === amount && raced.currency === currency
    ) return json({ ok: true, duplicate: true });
    return error(503, "payment_persistence_failed");
  }
  return json({ ok: true });
}

async function handleRefund(db: D1Database, value: unknown): Promise<Response> {
  const refund = object(value);
  const orderId = parseTelegramOrderPayload(refund?.invoice_payload);
  const providerPaymentId = telegramPaymentId(refund?.telegram_payment_charge_id);
  const amount = nonNegativeInt(refund?.total_amount);
  const currency = typeof refund?.currency === "string" ? refund.currency : null;
  if (!orderId || !providerPaymentId || amount == null || !currency) return error(400, "invalid_refund");
  const payment = await getPaymentByProviderId(db, "telegram_stars", providerPaymentId);
  if (!payment) return error(503, "payment_not_ready");
  if (payment.orderId !== orderId || payment.amount !== amount || payment.currency !== currency) return error(409, "refund_mismatch");
  if (payment.status === "refunded") return json({ ok: true, duplicate: true });
  const order = await getTelegramOrder(db, orderId);
  const product = order ? PRODUCTS[order.product] : null;
  if (!order || !product || payment.product !== product.id || order.billingKind !== product.billingKind) {
    return error(409, "refund_mismatch");
  }
  try {
    if (product.billingKind === "one_time") await refundTelegramOneTimePayment(db, payment, Date.now());
    else await refundTelegramPayment(db, payment, Date.now());
  }
  catch { return error(503, "refund_persistence_failed"); }
  return json({ ok: true });
}

async function handleSubscriptionUpdate(db: D1Database, value: unknown): Promise<Response> {
  const subscription = object(value);
  const payerId = telegramUserId(object(subscription?.user)?.id);
  const orderId = parseTelegramOrderPayload(subscription?.invoice_payload);
  const state = subscription?.state;
  if (!payerId || !orderId || (state !== "canceled" && state !== "active" && state !== "failed")) {
    return error(400, "invalid_subscription_update");
  }

  const order = await getTelegramOrder(db, orderId);
  const product = order ? PRODUCTS[order.product] : null;
  if (
    !order || !product || product.billingKind !== "subscription" ||
    order.billingKind !== "subscription" || order.telegramUserId !== payerId
  ) return error(409, "subscription_update_mismatch");

  try {
    const applied = await applyTelegramSubscriptionProviderState(db, orderId, payerId, state, Date.now());
    return applied ? json({ ok: true }) : json({ ok: true, ignored: true });
  } catch {
    return error(503, "subscription_update_persistence_failed");
  }
}

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const secret = ctx.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "";
  const token = ctx.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  if (!token || !secret) return error(503, "billing_unavailable");
  if (!telegramSecretMatches(ctx.request.headers.get("X-Telegram-Bot-Api-Secret-Token"), secret)) return error(401, "bad_secret");

  const raw = await readBodyBounded(ctx.request, 64 * 1024);
  if (!raw || raw.byteLength === 0) return error(400, "bad_json");
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder().decode(raw)); }
  catch { return error(400, "bad_json"); }
  const update = object(parsed);
  if (!update) return error(400, "bad_json");

  if (update.pre_checkout_query) return handlePreCheckout(ctx.env.DB, token, update.pre_checkout_query);
  if (update.subscription) return handleSubscriptionUpdate(ctx.env.DB, update.subscription);
  const message = object(update.message);
  if (!message) return json({ ok: true });
  if (message.successful_payment) return handleSuccessfulPayment(ctx.env.DB, message, message.successful_payment);
  if (message.refunded_payment) return handleRefund(ctx.env.DB, message.refunded_payment);
  return json({ ok: true });
};
