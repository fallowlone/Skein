/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { PRODUCTS } from "../../lib/products";
import { error, json } from "../../lib/response";

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  if (!ctx.data.userId) return error(401, "auth_required");
  const body = await ctx.request.json<{ product?: string }>().catch(() => ({}));
  const product = body.product ? PRODUCTS[body.product] : null;
  const token = ctx.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!product || !token) return error(400, "invalid_product");
  const response = await fetch(`https://api.telegram.org/bot${token}/createInvoiceLink`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: product.title,
      description: product.description,
      payload: JSON.stringify({ userId: ctx.data.userId, product: product.id, createdAt: Date.now() }),
      currency: "XTR",
      prices: [{ label: product.title, amount: product.amount }],
    }),
  });
  const result = await response.json<{ ok: boolean; result?: string }>();
  if (!result.ok || !result.result) return error(502, "telegram_unavailable");
  return json({ invoiceUrl: result.result });
};
