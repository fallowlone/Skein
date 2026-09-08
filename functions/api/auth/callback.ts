/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../lib/types";
import { exchangeCodeForUserWithToken, fetchViewerSponsorship } from "../../lib/github";
import { upsertUserFromGithub } from "../../lib/db";
import { coachConfig, reconcileGithubSponsorOnLogin, reconcileVerifiedGithubSponsorOnLogin } from "../../lib/coach";
import { createSession } from "../../lib/session";
import { parseCookies, verifyValue, signValue, serializeCookie, authHintCookie, isSecureRequest } from "../../lib/cookies";

function cookieName(env: Env): string { return env.COOKIE_NAME ?? "session"; }

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookies = parseCookies(request.headers.get("Cookie"));
  const signedState = cookies["oauth_state"];
  const verified = signedState ? await verifyValue(signedState, env.SESSION_SECRET) : null;
  if (!code || !state || !verified) return new Response("Bad request", { status: 400 });
  const [expectedState, lang, returnTo] = verified.split("|");
  if (state !== expectedState) return new Response("State mismatch", { status: 400 });

  let user;
  let accessToken = "";
  try {
    const exchanged = await exchangeCodeForUserWithToken(code, {
      clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET,
    });
    const { user: gh } = exchanged;
    accessToken = exchanged.accessToken;
    user = await upsertUserFromGithub(env.DB, gh);
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
    console.error("auth callback failed:", err);
    return new Response("Auth failed", { status: 502 });
  }

  const sid = await createSession(env.SESSIONS, user.id, accessToken, env.SESSION_SECRET);
  const signedSid = await signValue(sid, env.SESSION_SECRET);

  const secure = isSecureRequest(url, env);
  const headers = new Headers();
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
