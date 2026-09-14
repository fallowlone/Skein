/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { createTelegramOrder, markTelegramOrderFailed, markTelegramOrderInvoiceReady, telegramSchemaReady } from "../../lib/db";
import { coachConfig, readBodyBounded } from "../../lib/coach";
import { PRODUCTS } from "../../lib/products";
import { error, isSameOriginMutation, json } from "../../lib/response";
import { callTelegramApi, newTelegramOrderId, normalizeTelegramInvoiceUrl, TELEGRAM_ORDER_TTL_MS } from "../../lib/telegram";

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "auth_required");
  if (!isSameOriginMutation(ctx.request)) return error(403, "csrf");

  const token = ctx.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const webhookSecret = ctx.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "";
  if (!token || !webhookSecret || !(await telegramSchemaReady(ctx.env.DB))) return error(503, "billing_unavailable");

  const raw = await readBodyBounded(ctx.request, 8 * 1024);
  if (!raw || raw.byteLength === 0) return error(400, "bad_json");
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(raw)); }
  catch { return error(400, "bad_json"); }
  const requestedProduct = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).product
    : null;
  const product = typeof requestedProduct === "string" ? PRODUCTS[requestedProduct] : null;
  if (!product) return error(400, "invalid_product");
  if (product.entitlements.includes("coach") && !coachConfig(ctx.env).managedAiAvailable) {
    return error(503, "billing_unavailable");
  }

  const now = Date.now();
  const orderId = newTelegramOrderId();
  await createTelegramOrder(ctx.env.DB, {
    id: orderId,
    userId,
    product: product.id,
    amount: product.amount,
    currency: product.currency,
    billingKind: product.billingKind,
    subscriptionPeriodSeconds: product.subscriptionPeriodSeconds,
    checkoutExpiresAt: now + TELEGRAM_ORDER_TTL_MS,
  }, now);

  const invoice: Record<string, unknown> = {
    title: product.title,
    description: product.description,
    payload: orderId,
    currency: product.currency,
    prices: [{ label: product.title, amount: product.amount }],
  };
  if (product.billingKind === "subscription") invoice.subscription_period = product.subscriptionPeriodSeconds;
  const result = await callTelegramApi<string>(token, "createInvoiceLink", invoice);
  const invoiceUrl = normalizeTelegramInvoiceUrl(result);
  if (!invoiceUrl) {
    await markTelegramOrderFailed(ctx.env.DB, orderId, Date.now());
    return error(502, "telegram_unavailable");
  }
  await markTelegramOrderInvoiceReady(ctx.env.DB, orderId, Date.now());
  return json({
    invoiceUrl,
    orderId,
    product: {
      id: product.id,
      amount: product.amount,
      currency: product.currency,
      billingKind: product.billingKind,
      subscriptionPeriodSeconds: product.subscriptionPeriodSeconds,
    },
  }, 200, { "Cache-Control": "no-store" });
};
