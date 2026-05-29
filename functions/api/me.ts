/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { getUserById } from "../lib/db";
import { json, error } from "../lib/response";

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  const u = await getUserById(ctx.env.DB, userId);
  if (!u) return error(401, "unauthenticated");
  const termsCurrent = u.terms_accepted_at != null && u.terms_version === ctx.env.TERMS_VERSION;
  return json({
    login: u.login,
    nickname: u.nickname,
    avatarUrl: u.avatar_url,
    createdAt: u.created_at,
    termsAccepted: termsCurrent,
    termsVersion: ctx.env.TERMS_VERSION,
  });
};
