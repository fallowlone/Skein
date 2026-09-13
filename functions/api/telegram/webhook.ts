/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { createPayment, getPaymentByProviderId, setEntitlement } from "../../lib/db";
import { PRODUCTS } from "../../lib/products";
import { error, json } from "../../lib/response";

function okSecret(request: Request, secret: string): boolean {
  return Boolean(secret && request.headers.get("X-Telegram-Bot-Api-Secret-Token") === secret);
}

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  if (!okSecret(ctx.request, ctx.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "")) return error(401, "bad_secret");
  const update = await ctx.request.json<any>().catch(() => null);
  const payment = update?.message?.successful_payment;
  if (!payment) return json({ ok: true });
  let payload: any;
  try {
    payload = JSON.parse(payment.invoice_payload ?? "{}");
  } catch {
    return error(400, "invalid_payload");
  }
  if (!Number.isInteger(payload.userId) || typeof payload.product !== "string") return error(400, "invalid_payload");
  const product = PRODUCTS[payload.product];
  if (!product) return error(400, "unknown_product");
  if (payment.currency !== "XTR" || payment.total_amount !== product.amount) return error(400, "invalid_payment");
  if (await getPaymentByProviderId(ctx.env.DB, "telegram_stars", payment.telegram_payment_charge_id)) return json({ ok: true, duplicate: true });

  await createPayment(ctx.env.DB, {
    userId: payload.userId,
    provider: "telegram_stars",
    providerPaymentId: payment.telegram_payment_charge_id,
    product: product.id,
    amount: payment.total_amount,
    currency: payment.currency,
    status: "completed",
  }, Date.now());

  for (const entitlement of product.entitlements) {
    await setEntitlement(ctx.env.DB, payload.userId, entitlement, true, "telegram_stars", payment.telegram_payment_charge_id, Date.now());
  }
  return json({ ok: true });
};
