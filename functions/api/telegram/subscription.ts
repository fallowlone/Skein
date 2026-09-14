/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { getTelegramSubscriptionControl, setTelegramSubscriptionRenewalState, telegramSchemaReady } from "../../lib/db";
import { readBodyBounded } from "../../lib/coach";
import { error, isSameOriginMutation, json } from "../../lib/response";
import { callTelegramApi } from "../../lib/telegram";

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "auth_required");
  if (!isSameOriginMutation(ctx.request)) return error(403, "csrf");
  const token = ctx.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const webhookSecret = ctx.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "";
  if (!token || !webhookSecret || !(await telegramSchemaReady(ctx.env.DB))) return error(503, "billing_unavailable");

  const raw = await readBodyBounded(ctx.request, 4 * 1024);
  if (!raw || raw.byteLength === 0) return error(400, "bad_json");
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(raw)); }
  catch { return error(400, "bad_json"); }
  const action = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).action
    : null;
  if (action !== "cancel" && action !== "resume") return error(400, "invalid_action");

  const subscription = await getTelegramSubscriptionControl(ctx.env.DB, userId, Date.now());
  if (!subscription) return error(404, "subscription_not_found");
  const telegramUserId = Number(subscription.telegramUserId);
  if (!Number.isSafeInteger(telegramUserId) || telegramUserId <= 0) return error(500, "invalid_subscription_state");

  const canceled = action === "cancel";
  const changed = await callTelegramApi<boolean>(token, "editUserStarSubscription", {
    user_id: telegramUserId,
    telegram_payment_charge_id: subscription.providerPaymentId,
    is_canceled: canceled,
  });
  if (changed !== true) return error(502, "telegram_unavailable");
  await setTelegramSubscriptionRenewalState(ctx.env.DB, subscription.orderId, canceled, Date.now());
  return json({
    ok: true,
    renewal: canceled ? "cancelled" : "active",
    accessExpiresAt: new Date(subscription.expiresAt).toISOString(),
  }, 200, { "Cache-Control": "no-store" });
};
