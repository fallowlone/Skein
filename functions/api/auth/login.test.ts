import { describe, expect, it } from "vitest";
import { onRequestGet } from "./login";

describe("OAuth login return target", () => {
  it("encodes only the fixed Coach return target in signed state", async () => {
    const response = await onRequestGet({
      request: new Request("https://skein.test/api/auth/login?lang=ru&returnTo=coach"),
      env: { GITHUB_CLIENT_ID: "client", SESSION_SECRET: "secret" },
    } as any);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("github.com/login/oauth/authorize");
    expect(response.headers.get("set-cookie")).toContain("oauth_state=");
  });
});
