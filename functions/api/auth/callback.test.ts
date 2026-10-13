import { describe, expect, it, vi, afterEach } from "vitest";
import { onRequestGet } from "./callback";
import { signValue } from "../../lib/cookies";
import { FakeD1, FakeKV } from "../../test/fakes";

afterEach(() => vi.restoreAllMocks());

const env = {
  GITHUB_CLIENT_ID: "client",
  GITHUB_CLIENT_SECRET: "secret",
  SESSION_SECRET: "secret",
  TERMS_VERSION: "v1",
  DB: new FakeD1(),
  SESSIONS: new FakeKV(),
} as any;

async function signedState(lang = "en") {
  return signValue(`some-uuid|${lang}|account|v1`, "secret");
}

describe("OAuth callback failures", () => {
  it("redirects to the account page instead of a dead 400 when state is missing", async () => {
    const res = await onRequestGet({
      request: new Request("https://skein.test/api/auth/callback?code=x&state=y"),
      env,
    } as any);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/en/account?auth=failed");
    expect(res.headers.get("set-cookie")).toContain("oauth_state=;");
  });

  it("keeps the pre-login language from the state cookie on state mismatch", async () => {
    const res = await onRequestGet({
      request: new Request("https://skein.test/api/auth/callback?code=x&state=wrong", {
        headers: { Cookie: `oauth_state=${await signedState("ru")}` },
      }),
      env,
    } as any);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/ru/account?auth=failed");
  });

  it("redirects with cancelled when GitHub reports access_denied", async () => {
    const res = await onRequestGet({
      request: new Request("https://skein.test/api/auth/callback?error=access_denied", {
        headers: { Cookie: `oauth_state=${await signedState("ru")}` },
      }),
      env,
    } as any);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/ru/account?auth=cancelled");
  });

  it("redirects instead of a 502 when the token exchange fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad_verification_code" }), {
        headers: { "content-type": "application/json" },
      }),
    ));
    const state = "some-uuid";
    const signed = await signValue(`${state}|en|account|v1`, "secret");
    const res = await onRequestGet({
      request: new Request(`https://skein.test/api/auth/callback?code=expired&state=${state}`, {
        headers: { Cookie: `oauth_state=${signed}` },
      }),
      env,
    } as any);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/en/account?auth=failed");
  });
});
