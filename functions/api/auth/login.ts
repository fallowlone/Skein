/// <reference types="@cloudflare/workers-types" />
import type { Env } from "../../lib/types";
import { authorizeUrl } from "../../lib/github";
import { readBodyBounded } from "../../lib/coach";
import { signValue, serializeCookie, isSecureRequest } from "../../lib/cookies";
import { error, isSameOriginMutation } from "../../lib/response";

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const lang = url.searchParams.get("lang") === "ru" ? "ru" : "en";
  const returnTo = url.searchParams.get("returnTo") === "coach" ? "?returnTo=coach" : "";
  return Response.redirect(`${url.origin}/${lang}/account/${returnTo}`, 302);
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  if (!isSameOriginMutation(request)) return error(403, "csrf");
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return error(400, "bad_form");
  const raw = await readBodyBounded(request, 1024);
  if (!raw) return error(400, "bad_form");
  const form = new URLSearchParams(new TextDecoder().decode(raw));
  if (form.get("terms") !== "accept" || !env.TERMS_VERSION) return error(400, "terms_required");
  const lang = form.get("lang") === "ru" ? "ru" : "en";
  const returnTo = form.get("returnTo") === "coach" ? "coach" : "account";

  // random state, stored signed in a short-lived cookie for CSRF protection
  const state = crypto.randomUUID();
  const stateCookie = await signValue(`${state}|${lang}|${returnTo}|${env.TERMS_VERSION}`, env.SESSION_SECRET);
  const redirectUri = `${url.origin}/api/auth/callback`;

  const headers = new Headers();
  headers.append("Set-Cookie", serializeCookie("oauth_state", stateCookie, {
    httpOnly: true, secure: isSecureRequest(url, env), maxAge: 600, sameSite: "Lax",
  }));
  headers.set("Location", authorizeUrl(env.GITHUB_CLIENT_ID, redirectUri, state));
  return new Response(null, { status: 302, headers });
};
