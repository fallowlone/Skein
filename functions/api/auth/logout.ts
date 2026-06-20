/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../lib/types";
import { parseCookies, verifyValue, serializeCookie, authHintCookie, isSecureRequest } from "../../lib/cookies";
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
  // The clear cookie must carry the same Secure attribute as the set cookie.
  // A __Host--prefixed cookie (prod COOKIE_NAME) is rejected by browsers unless
  // Secure is present, so without this the cookie would never be deleted client-side.
  const secure = isSecureRequest(new URL(request.url), env);
  headers.append("Set-Cookie", serializeCookie(cookieName(env), "", { httpOnly: true, secure, maxAge: 0 }));
  headers.append("Set-Cookie", authHintCookie(false, secure));
  return json({ ok: true }, 200, headers);
};
