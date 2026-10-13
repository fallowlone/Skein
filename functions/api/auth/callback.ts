/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../lib/types";
import type { BoundLogger } from "../../lib/logger";
import { exchangeCodeForUserWithToken, fetchViewerSponsorship } from "../../lib/github";
import { acceptTerms, upsertUserFromGithub } from "../../lib/db";
import { coachConfig, reconcileGithubSponsorOnLogin, reconcileVerifiedGithubSponsorOnLogin } from "../../lib/coach";
import { createSession } from "../../lib/session";
import { parseCookies, verifyValue, signValue, serializeCookie, authHintCookie, isSecureRequest } from "../../lib/cookies";

function cookieName(env: Env): string { return env.COOKIE_NAME ?? "session"; }

function failRedirect(
  request: Request,
  env: Env,
  signedState: string | undefined,
  reason: "failed" | "cancelled" | "terms_required",
  // Machine-readable failure branch for the login funnel (pageview URLs stay
  // distinct per branch). Generic on purpose — no failure detail leaks.
  detail?: "bad_request" | "state" | "terms" | "exchange" | "session",
  // Bound per-request logger (optional: unit tests call without middleware).
  // Every failure branch logs auth.failed with the unverified 5th state
  // segment as flow, so the funnel joins it to the login request's
  // auth.started line.
  log?: BoundLogger,
): Response {
  // The OAuth state cookie is the only place the pre-login language lives.
  // verifyValue may fail here (that is why we are failing), so fall back to the
  // unverified payload for routing only — it is never trusted for auth.
  let lang = "en";
  let flow: string | undefined;
  if (signedState) {
    const dot = signedState.lastIndexOf(".");
    const raw = dot >= 0 ? signedState.slice(0, dot) : signedState;
    const segs = raw.split("|");
    const guess = segs[1];
    if (guess === "ru" || guess === "en") lang = guess;
    if (typeof segs[4] === "string" && segs[4].length > 0) flow = segs[4];
  }
  log?.log("warn", "auth.failed", detail ?? reason, flow ? { flow } : {});
  const secure = isSecureRequest(new URL(request.url), env);
  const headers = new Headers();
  headers.append("Set-Cookie", serializeCookie("oauth_state", "", { httpOnly: true, secure, maxAge: 0 }));
  headers.set("Location", `/${lang}/account?auth=${reason}${detail ? `&reason=${detail}` : ""}`);
  return new Response(null, { status: 302, headers });
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  // Bound by _middleware; absent in unit tests (failRedirect tolerates that).
  const logger = (ctx as any).data?.logger as BoundLogger | undefined;

  const cookies = parseCookies(request.headers.get("Cookie"));
  const signedState = cookies["oauth_state"];
  // GitHub redirects back with ?error=access_denied when the user cancels.
  if (url.searchParams.get("error")) return failRedirect(request, env, signedState, "cancelled", undefined, logger);
  if (!code || !state) {
    console.error("auth callback [bad_request]: missing code or state");
    return failRedirect(request, env, signedState, "failed", "bad_request", logger);
  }
  const verified = signedState ? await verifyValue(signedState, env.SESSION_SECRET) : null;
  if (!verified) {
    console.error("auth callback [state]: missing or invalid state cookie");
    return failRedirect(request, env, signedState, "failed", "state", logger);
  }
  const [expectedState, lang, returnTo, termsVersion, loginRid] = verified.split("|");
  if (state !== expectedState) {
    console.error("auth callback [state]: state mismatch");
    return failRedirect(request, env, signedState, "failed", "state", logger);
  }
  if (!termsVersion || termsVersion !== env.TERMS_VERSION) {
    console.error("auth callback [terms]: terms version mismatch");
    return failRedirect(request, env, signedState, "failed", "terms", logger);
  }

  let user;
  let accessToken = "";
  try {
    const exchanged = await exchangeCodeForUserWithToken(code, {
      clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET,
    });
    const { user: gh } = exchanged;
    accessToken = exchanged.accessToken;
    user = await upsertUserFromGithub(env.DB, gh);
    await acceptTerms(env.DB, user.id, termsVersion, Date.now());
    const cfg = coachConfig(env);
    try {
      if (cfg.billingConfigured && cfg.sponsorableLogin) {
        // Verify the viewer's own sponsorship while the OAuth token is already
        // in memory. The token is later kept encrypted in the server-side
        // session; this also lets private
        // sponsors claim Coach without making their sponsorship public.
        const live = await fetchViewerSponsorship(accessToken, cfg.sponsorableLogin);
        await reconcileVerifiedGithubSponsorOnLogin(env.DB, gh.id, user.id, cfg, live);
      } else {
        await reconcileGithubSponsorOnLogin(env.DB, gh.id, user.id, cfg);
      }
    } catch (err) {
      // Monetization reconciliation must never make free account login unavailable.
      // Fall back to webhook state for identifiable sponsors; private sponsors
      // simply retry OAuth verification on a later login.
      try { await reconcileGithubSponsorOnLogin(env.DB, gh.id, user.id, cfg); }
      catch { /* the free login must still succeed */ }
      console.error("coach sponsorship reconcile failed:", err);
    }
  } catch (err) {
    // Keep the full cause in the log (visible via `wrangler pages deployment tail`)
    // but return a generic body — no failure detail (e.g. the GitHub error code)
    // leaks to the client.
    console.error("auth callback [exchange] failed:", err);
    return failRedirect(request, env, signedState, "failed", "exchange", logger);
  }

  let sid: string;
  let signedSid: string;
  try {
    sid = await createSession(env.SESSIONS, user.id, accessToken, env.SESSION_SECRET);
    signedSid = await signValue(sid, env.SESSION_SECRET);
  } catch (err) {
    // Previously an uncaught 500 with no funnel signal. A dead session store
    // looks exactly like "callback done, session never ok" from the outside.
    console.error("auth callback [session] failed:", err);
    return failRedirect(request, env, signedState, "failed", "session", logger);
  }

  const secure = isSecureRequest(url, env);
  const headers = new Headers();
  // Pre-deploy state cookies have 4 segments (no flow); still log success.
  logger?.log("info", "auth.success", "login complete", loginRid ? { flow: loginRid } : {});
  headers.append("Set-Cookie", serializeCookie(cookieName(env), signedSid, {
    httpOnly: true, secure, maxAge: 60 * 60 * 24 * 30, sameSite: "Lax",
  }));
  // Readable hint so the client can skip /api/me when no session exists.
  headers.append("Set-Cookie", authHintCookie(true, secure));
  // clear the state cookie (Secure mirrors the set path so a prefixed clear cookie isn't rejected)
  headers.append("Set-Cookie", serializeCookie("oauth_state", "", { httpOnly: true, secure, maxAge: 0 }));
  headers.set("Location", returnTo === "coach"
    ? `/${lang === "ru" ? "ru" : "en"}/settings#coach-plan`
    : `/${lang === "ru" ? "ru" : "en"}/account`);
  return new Response(null, { status: 302, headers });
};
