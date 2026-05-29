/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../../lib/types";
import { acceptTerms } from "../../lib/db";
import { json, error } from "../../lib/response";

export const onRequestPost: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  await acceptTerms(ctx.env.DB, userId, ctx.env.TERMS_VERSION, Date.now());
  return json({ ok: true, termsVersion: ctx.env.TERMS_VERSION });
};
