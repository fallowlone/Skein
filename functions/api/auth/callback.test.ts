import { describe, expect, it, vi, afterEach } from "vitest";
import { onRequestGet } from "./callback";
import { signValue } from "../../lib/cookies";
import { bindLogger, type LogEntry } from "../../lib/logger";
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
    expect(res.headers.get("location")).toBe("/en/account?auth=failed&reason=state");
    expect(res.headers.get("set-cookie")).toContain("oauth_state=;");
  });

  it("tags a state mismatch with reason=state", async () => {
    const res = await onRequestGet({
      request: new Request("https://skein.test/api/auth/callback?code=x&state=wrong", {
        headers: { Cookie: `oauth_state=${await signedState("ru")}` },
      }),
      env,
    } as any);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/ru/account?auth=failed&reason=state");
  });

  it("tags a stale terms version with reason=terms", async () => {
    const signed = await signValue("some-uuid|en|account|v0", "secret");
    const res = await onRequestGet({
      request: new Request("https://skein.test/api/auth/callback?code=x&state=some-uuid", {
        headers: { Cookie: `oauth_state=${signed}` },
      }),
      env,
    } as any);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/en/account?auth=failed&reason=terms");
  });

  it("keeps the pre-login language from the state cookie on state mismatch", async () => {
    const res = await onRequestGet({
      request: new Request("https://skein.test/api/auth/callback?code=x&state=wrong", {
        headers: { Cookie: `oauth_state=${await signedState("ru")}` },
      }),
      env,
    } as any);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/ru/account?auth=failed&reason=state");
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
    expect(res.headers.get("location")).toBe("/en/account?auth=failed&reason=exchange");
  });

  it("redirects with reason=session instead of an uncaught 500 when session creation throws", async () => {
    const brokenEnv = { ...env, SESSIONS: { get: async () => { throw new Error("kv down"); } } } as any;
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "t" }), {
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1, login: "u", avatar_url: null }), {
        headers: { "content-type": "application/json" },
      })));
    const state = "some-uuid";
    const signed = await signValue(`${state}|en|account|v1`, "secret");
    const res = await onRequestGet({
      request: new Request(`https://skein.test/api/auth/callback?code=ok&state=${state}`, {
        headers: { Cookie: `oauth_state=${signed}` },
      }),
      env: brokenEnv,
    } as any);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/en/account?auth=failed&reason=session");
  });

  it("logs auth.failed with the state cookie flow on state mismatch", async () => {
    const buf: LogEntry[] = [];
    const logger = bindLogger(buf, { route: "/api/auth/callback", rid: "cb-rid" });
    const signed = await signValue("some-uuid|en|account|v1|cb-flow", "secret");
    const res = await onRequestGet({
      request: new Request("https://skein.test/api/auth/callback?code=x&state=wrong", {
        headers: { Cookie: `oauth_state=${signed}` },
      }),
      env,
      data: { requestId: "cb-rid", logger },
    } as any);
    expect(res.status).toBe(302);
    const failed = buf.find((e) => e.tag === "auth.failed");
    expect(failed?.flow).toBe("cb-flow");
    expect(failed?.rid).toBe("cb-rid");
  });

  it("logs auth.success with the state cookie flow on login success", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "t" }), {
        headers: { "content-type": "application/json" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 7, login: "u", avatar_url: null }), {
        headers: { "content-type": "application/json" },
      })));
    const buf: LogEntry[] = [];
    const logger = bindLogger(buf, { route: "/api/auth/callback", rid: "cb-rid-7" });
    const freshEnv = { ...env, DB: new FakeD1(), SESSIONS: new FakeKV() } as any;
    const signed = await signValue("login-state|en|account|v1|login-flow-9", "secret");
    const res = await onRequestGet({
      request: new Request("https://skein.test/api/auth/callback?code=ok&state=login-state", {
        headers: { Cookie: `oauth_state=${signed}` },
      }),
      env: freshEnv,
      data: { requestId: "cb-rid-7", logger },
    } as any);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/en/account");
    const success = buf.find((e) => e.tag === "auth.success");
    expect(success?.flow).toBe("login-flow-9");
    expect(success?.rid).toBe("cb-rid-7");
  });
});
