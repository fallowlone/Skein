/// <reference types="@cloudflare/workers-types" />
import type { Env, RequestData } from "./lib/types";
import { resolveSessionRecord } from "./lib/session";
import { parseCookies, verifyValue } from "./lib/cookies";
import { rateLimit } from "./lib/ratelimit";
import { withSecurityHeaders, error } from "./lib/response";
import { bindLogger, type BoundLogger, type LogEntry } from "./lib/logger";
import { flushLogs } from "./lib/logstore";

function cookieName(env: Env): string { return env.COOKIE_NAME ?? "session"; }

export function requiresAccount(pathname: string): boolean {
  const path = pathname.replace(/^\/(en|ru)(?=\/)/, "");
  return /^\/(?:calibrate|assess|assess-items\.json|assess-concepts\.json|interview|interview-qa|review|algorithm-workspace)(?:\/|$)/.test(path) ||
    /^\/english\/(?:grammar|writing|speaking|review|reading)(?:\/|$)/.test(path) ||
    /^\/learn\/[^/]+\/lab(?:\/|$)/.test(path) ||
    /^\/projects\/[^/]+(?:\/|$)/.test(path);
}

export const onRequest: PagesFunction<Env, any, RequestData> = async (ctx) => {
  const { request, env, next, data } = ctx;

  // Logger/buffer init is the first statement: early returns below must be
  // logged, and the flush in `finally` must see every entry.
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();
  const buf: LogEntry[] = [];
  const logger: BoundLogger = bindLogger(buf, { route: url.pathname, rid: requestId, user: null });
  data.requestId = requestId;
  data.log = buf;
  data.logger = logger;
  const respond = (res: Response): Response => {
    // Set rid after the wrap: incoming headers may be immutable
    // (e.g. Response.redirect), the rebuilt ones never are.
    const out = withSecurityHeaders(res);
    out.headers.set("X-Request-Id", requestId);
    return out;
  };

  // Single error boundary for every endpoint: a D1/KV outage (or any unhandled
  // throw downstream) becomes a generic 500 instead of a stack trace to the client.
  try {
    // Resolve session (signed cookie -> sid -> userId)
    data.userId = null;
    const cookies = parseCookies(request.headers.get("Cookie"));
    const signed = cookies[cookieName(env)];
    if (signed) {
      const sid = await verifyValue(signed, env.SESSION_SECRET);
      if (sid) {
        const session = await resolveSessionRecord(env.SESSIONS, sid, env.SESSION_SECRET);
        data.userId = session?.userId ?? null;
        data.githubAccessToken = session?.githubAccessToken;
      }
    }
    logger.setUser(data.userId);

    if (!data.userId && requiresAccount(url.pathname)) {
      const lang = url.pathname.startsWith("/ru/") ? "ru" : "en";
      if (url.pathname.endsWith(".json")) {
        logger.log("warn", "api.auth_required", "guest hit account-gated JSON");
        return respond(error(401, "auth_required"));
      }
      logger.log("warn", "api.account_redirect", "guest redirected to account");
      return respond(Response.redirect(`${url.origin}/${lang}/account/`, 302));
    }

    // Rate-limit mutating API calls per IP
    if (url.pathname.startsWith("/api/") && request.method !== "GET") {
      const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
      const rl = await rateLimit({ kv: env.SESSIONS, ip, bucket: "api-write", limit: 60, windowSec: 60 });
      if (!rl.ok) {
        logger.log("warn", "api.rate_limited", "rate limit exceeded", { ip });
        return respond(error(429, "rate_limited"));
      }
    }

    return respond(await next());
  } catch (e) {
    logger.log("error", "api.unhandled", "unhandled middleware error", {
      stack: e instanceof Error ? (e.stack ?? e.message) : String(e),
    });
    return respond(error(500, "internal"));
  } finally {
    ctx.waitUntil?.(flushLogs(env, buf));
  }
};
