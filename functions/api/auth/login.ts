/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../lib/types";
import { authorizeUrl } from "../../lib/github";
import { signValue, serializeCookie, isSecureRequest } from "../../lib/cookies";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") === "ru" ? "ru" : "en";

  // random state, stored signed in a short-lived cookie for CSRF protection
  const state = crypto.randomUUID();
  const stateCookie = await signValue(`${state}|${lang}`, env.SESSION_SECRET);
  const redirectUri = `${url.origin}/api/auth/callback`;

  const headers = new Headers();
  headers.append("Set-Cookie", serializeCookie("oauth_state", stateCookie, {
    httpOnly: true, secure: isSecureRequest(url, env), maxAge: 600, sameSite: "Lax",
  }));
  headers.set("Location", authorizeUrl(env.GITHUB_CLIENT_ID, redirectUri, state));
  return new Response(null, { status: 302, headers });
};
