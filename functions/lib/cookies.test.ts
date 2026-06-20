// functions/lib/cookies.test.ts
import { describe, it, expect } from "vitest";
import { signValue, verifyValue, serializeCookie, parseCookies, isSecureRequest } from "./cookies";

const SECRET = "test-secret-please-ignore";

describe("cookies", () => {
  it("sign/verify round-trips", async () => {
    const signed = await signValue("hello", SECRET);
    expect(await verifyValue(signed, SECRET)).toBe("hello");
  });

  it("rejects a tampered value", async () => {
    const signed = await signValue("hello", SECRET);
    const tampered = signed.replace(/^hello/, "hacked");
    expect(await verifyValue(tampered, SECRET)).toBeNull();
  });

  it("rejects a wrong secret", async () => {
    const signed = await signValue("hello", SECRET);
    expect(await verifyValue(signed, "other-secret")).toBeNull();
  });

  it("isSecureRequest: https always secure; http secure only when CF_PAGES set", () => {
    const https = new URL("https://example.com/api/auth/login");
    const http = new URL("http://localhost:8788/api/auth/login");
    expect(isSecureRequest(https, {})).toBe(true);              // prod TLS
    expect(isSecureRequest(http, { CF_PAGES: "1" })).toBe(true); // CF behind http proxy
    expect(isSecureRequest(http, {})).toBe(false);             // local wrangler dev
  });

  it("serializes attributes and parses a header", () => {
    const c = serializeCookie("session", "abc", { httpOnly: true, maxAge: 60, secure: true });
    expect(c).toContain("session=abc");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Max-Age=60");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=Lax");
    expect(parseCookies("a=1; session=abc; b=2").session).toBe("abc");
  });
});
