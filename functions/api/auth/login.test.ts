import { describe, expect, it } from "vitest";
import { onRequestGet, onRequestPost } from "./login";

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
    expect((await onRequestPost(ctx("lang=ru&returnTo=coach"))).status).toBe(400);
    expect((await onRequestPost(ctx("lang=ru&terms=accept", "https://other.test"))).status).toBe(403);
    const response = await onRequestPost(ctx("lang=ru&returnTo=coach&terms=accept"));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("github.com/login/oauth/authorize");
    expect(response.headers.get("set-cookie")).toContain("oauth_state=");
  });
});
