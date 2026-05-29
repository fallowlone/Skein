/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "./lib/types";
import { resolveSession } from "./lib/session";
import { parseCookies, verifyValue } from "./lib/cookies";
import { rateLimit } from "./lib/ratelimit";
import { withSecurityHeaders, error } from "./lib/response";

function cookieName(env: Env): string { return env.COOKIE_NAME ?? "session"; }

export const onRequest: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const { request, env, next, data } = ctx;
  const url = new URL(request.url);

  // Resolve session (signed cookie -> sid -> userId)
  data.userId = null;
  const cookies = parseCookies(request.headers.get("Cookie"));
  const signed = cookies[cookieName(env)];
  if (signed) {
    const sid = await verifyValue(signed, env.SESSION_SECRET);
    if (sid) data.userId = await resolveSession(env.SESSIONS, sid);
  }

  // Rate-limit mutating API calls per IP
  if (url.pathname.startsWith("/api/") && request.method !== "GET") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const rl = await rateLimit({ kv: env.SESSIONS, ip, bucket: "api-write", limit: 60, windowSec: 60 });
    if (!rl.ok) return withSecurityHeaders(error(429, "rate_limited"));
  }

  return withSecurityHeaders(await next());
};
