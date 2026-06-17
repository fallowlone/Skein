/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../lib/types";
import { exchangeCodeForUser } from "../../lib/github";
import { upsertUserFromGithub } from "../../lib/db";
import { createSession } from "../../lib/session";
import { parseCookies, verifyValue, signValue, serializeCookie, authHintCookie } from "../../lib/cookies";

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
  const [expectedState, lang] = verified.split("|");
  if (state !== expectedState) return new Response("State mismatch", { status: 400 });

  let user;
  try {
    const gh = await exchangeCodeForUser(code, {
      clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET,
    });
    user = await upsertUserFromGithub(env.DB, gh);
  } catch (err) {
    // Keep the full cause in the log (visible via `wrangler pages deployment tail`)
    // but return a generic body — no failure detail (e.g. the GitHub error code)
    // leaks to the client.
    console.error("auth callback failed:", err);
    return new Response("Auth failed", { status: 502 });
  }

  const sid = await createSession(env.SESSIONS, user.id);
  const signedSid = await signValue(sid, env.SESSION_SECRET);

  const headers = new Headers();
  headers.append("Set-Cookie", serializeCookie(cookieName(env), signedSid, {
    httpOnly: true, secure: url.protocol === "https:", maxAge: 60 * 60 * 24 * 30, sameSite: "Lax",
  }));
  // Readable hint so the client can skip /api/me when no session exists.
  headers.append("Set-Cookie", authHintCookie(true, url.protocol === "https:"));
  // clear the state cookie (Secure mirrors the set path so a prefixed clear cookie isn't rejected)
  headers.append("Set-Cookie", serializeCookie("oauth_state", "", { httpOnly: true, secure: url.protocol === "https:", maxAge: 0 }));
  headers.set("Location", `/${lang === "ru" ? "ru" : "en"}/account`);
  return new Response(null, { status: 302, headers });
};
