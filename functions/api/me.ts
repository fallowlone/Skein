/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { getUserById, termsCurrent } from "../lib/db";
import { json, error } from "../lib/response";

export const onRequestGet: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  // Anonymous visitors are the common case on public pages. Answer 200 with a
  // sentinel instead of 401 so the browser does not log a console error (the
  // 401 counted against the Lighthouse "errors in console" best-practices audit).
  // The client wrapper (fetchMe) treats {authenticated:false} as signed-out.
  if (!userId) return json({ authenticated: false });
  const u = await getUserById(ctx.env.DB, userId);
  if (!u) return json({ authenticated: false });
  return json({
    login: u.login,
    nickname: u.nickname,
    avatarUrl: u.avatar_url,
    createdAt: u.created_at,
    termsAccepted: termsCurrent(u, ctx.env),
    termsVersion: ctx.env.TERMS_VERSION,
  });
};
