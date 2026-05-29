/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "../lib/types";
import { deleteUser } from "../lib/db";
import { destroyAllSessions } from "../lib/session";
import { serializeCookie } from "../lib/cookies";
import { json, error } from "../lib/response";

function cookieName(env: Env): string { return env.COOKIE_NAME ?? "session"; }

export const onRequestDelete: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const userId = ctx.data.userId;
  if (!userId) return error(401, "unauthenticated");
  await deleteUser(ctx.env.DB, userId);               // removes user + progress (cascade)
  await destroyAllSessions(ctx.env.SESSIONS, userId); // kills every session
  const headers = new Headers();
  // Clear cookie must carry Secure to match the set path — a __Host--prefixed
  // cookie (prod COOKIE_NAME) is rejected by browsers without it, so otherwise
  // the cookie would never be deleted client-side.
  const secure = new URL(ctx.request.url).protocol === "https:";
  headers.append("Set-Cookie", serializeCookie(cookieName(ctx.env), "", { httpOnly: true, secure, maxAge: 0 }));
  return json({ ok: true }, 200, headers);
};
