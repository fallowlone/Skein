/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../lib/types";
import { parseCookies, verifyValue, serializeCookie } from "../../lib/cookies";
import { destroySession } from "../../lib/session";
import { json } from "../../lib/response";

function cookieName(env: Env): string { return env.COOKIE_NAME ?? "session"; }

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const signed = cookies[cookieName(env)];
  if (signed) {
    const sid = await verifyValue(signed, env.SESSION_SECRET);
    if (sid) await destroySession(env.SESSIONS, sid);
  }
  const headers = new Headers();
  headers.append("Set-Cookie", serializeCookie(cookieName(env), "", { httpOnly: true, maxAge: 0 }));
  return json({ ok: true }, 200, headers);
};
