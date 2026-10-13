import { describe, expect, it } from "vitest";
import { onRequestGet, onRequestPost } from "./login";
import { bindLogger, type LogEntry } from "../../lib/logger";

describe("OAuth login return target", () => {
  it("sends direct login links to the consent form", async () => {
    const response = await onRequestGet({
      request: new Request("https://skein.test/api/auth/login?lang=ru&returnTo=coach"),
      env: { GITHUB_CLIENT_ID: "client", SESSION_SECRET: "secret" },
    } as any);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://skein.test/ru/account/?returnTo=coach");
  });

  it("requires explicit same-origin terms acceptance before GitHub OAuth", async () => {
    const ctx = (body: string, origin = "https://skein.test") => ({
      request: new Request("https://skein.test/api/auth/login", {
        method: "POST", headers: { origin, "content-type": "application/x-www-form-urlencoded" }, body,
      }),
      env: { GITHUB_CLIENT_ID: "client", SESSION_SECRET: "secret", TERMS_VERSION: "v1" },
    } as any);
    expect((await onRequestPost(ctx("lang=ru&returnTo=coach"))).status).toBe(302);
    const termsRedirect = await onRequestPost(ctx("lang=ru&returnTo=coach"));
    expect(termsRedirect.headers.get("location")).toBe("/ru/account?auth=terms_required");
    expect((await onRequestPost(ctx("lang=ru&terms=accept", "https://other.test"))).status).toBe(403);
    const response = await onRequestPost(ctx("lang=ru&returnTo=coach&terms=accept"));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("github.com/login/oauth/authorize");
    expect(response.headers.get("set-cookie")).toContain("oauth_state=");
  });

  it("stores the login request rid as a 5th oauth_state segment", async () => {
    const response = await onRequestPost({
      request: new Request("https://skein.test/api/auth/login", {
        method: "POST",
        headers: { origin: "https://skein.test", "content-type": "application/x-www-form-urlencoded" },
        body: "lang=en&terms=accept",
      }),
      env: { GITHUB_CLIENT_ID: "client", SESSION_SECRET: "secret", TERMS_VERSION: "v1" },
    } as any);
    const setCookie = response.headers.get("set-cookie") ?? "";
    const signed = (setCookie.split(";")[0].split("oauth_state=")[1] ?? "");
    const raw = signed.slice(0, signed.lastIndexOf("."));
    const segs = raw.split("|");
    expect(segs).toHaveLength(5);
    expect(segs[4]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("logs auth.started with flow === its own rid", async () => {
    const buf: LogEntry[] = [];
    const logger = bindLogger(buf, { route: "/api/auth/login", rid: "login-rid" });
    await onRequestPost({
      request: new Request("https://skein.test/api/auth/login", {
        method: "POST",
        headers: { origin: "https://skein.test", "content-type": "application/x-www-form-urlencoded" },
        body: "lang=en&terms=accept",
      }),
      env: { GITHUB_CLIENT_ID: "client", SESSION_SECRET: "secret", TERMS_VERSION: "v1" },
      data: { requestId: "login-rid", logger },
    } as any);
    const started = buf.find((e) => e.tag === "auth.started");
    expect(started?.flow).toBe("login-rid");
  });
});
