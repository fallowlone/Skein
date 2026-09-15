/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { listPaymentsForUser, telegramSchemaReady } from "../../lib/db";
import { error, json } from "../../lib/response";

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "auth_required");
  if (!(await telegramSchemaReady(ctx.env.DB))) return error(503, "billing_unavailable");
  const payments = await listPaymentsForUser(ctx.env.DB, userId);
  return json({
    payments: payments.map((payment) => ({
      provider: payment.provider,
      product: payment.product,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      createdAt: new Date(payment.createdAt).toISOString(),
      subscriptionExpiresAt: payment.subscriptionExpiresAt
        ? new Date(payment.subscriptionExpiresAt).toISOString()
        : null,
    })),
  }, 200, { "Cache-Control": "no-store" });
};
