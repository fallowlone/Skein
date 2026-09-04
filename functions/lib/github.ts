import type { GithubUser } from "./db";

interface GithubUserPayload { id: number; login: string; avatar_url: string | null; }

export function mapGithubUser(p: GithubUserPayload): GithubUser {
  return { id: p.id, login: p.login, avatar_url: p.avatar_url ?? null };
}

export async function exchangeCodeForUser(
  code: string,
  creds: { clientId: string; clientSecret: string },
): Promise<GithubUser> {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ client_id: creds.clientId, client_secret: creds.clientSecret, code }),
  });
  // Symmetric with the user fetch: guard the status before parsing so a non-JSON
  // 5xx/429 body throws our typed error, not a raw SyntaxError. Never include the
  // response body in the error — it may carry the access token.
  if (!tokenRes.ok) throw new Error(`github_token_exchange_failed: http_${tokenRes.status}`);
  const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string; error?: string;
  };
  // On the failure path GitHub returns HTTP 200 with {error,error_description} and
  // NO token, so surfacing `error` here cannot leak a token — it pinpoints the
  // cause (incorrect_client_credentials | bad_verification_code | redirect_uri_mismatch).
  if (!tokenJson.access_token) {
    throw new Error(`github_token_exchange_failed: ${tokenJson.error ?? "no_access_token"}`);
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      accept: "application/vnd.github+json",
      "user-agent": "skein",
    },
  });
  if (!userRes.ok) throw new Error("github_user_fetch_failed");
  const payload = (await userRes.json()) as GithubUserPayload;
  return mapGithubUser(payload);
}

/** Build the GitHub authorize URL. */
export function authorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("scope", "read:user");
  u.searchParams.set("state", state);
  return u.toString();
}
