// functions/lib/response.test.ts
import { describe, it, expect } from "vitest";
import { json, error, withSecurityHeaders } from "./response";

describe("response", () => {
  it("json sets content-type and status", async () => {
    const r = json({ ok: true }, 201);
    expect(r.status).toBe(201);
    expect(r.headers.get("content-type")).toContain("application/json");
    expect(await r.json()).toEqual({ ok: true });
  });

  it("error returns a json error body", async () => {
    const r = error(429, "rate_limited");
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: "rate_limited" });
  });

  it("withSecurityHeaders adds headers without dropping existing ones", () => {
    const base = new Response("x", { headers: { "x-test": "1" } });
    const r = withSecurityHeaders(base);
    expect(r.headers.get("x-test")).toBe("1");
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(r.headers.get("X-Frame-Options")).toBe("DENY");
    expect(r.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("sets HSTS, Permissions-Policy, COOP and CORP", () => {
    const r = withSecurityHeaders(new Response("x"));
    expect(r.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(r.headers.get("Strict-Transport-Security")).toContain("includeSubDomains");
    const pp = r.headers.get("Permissions-Policy") ?? "";
    expect(pp).toContain("microphone=(self)"); // speaking module must keep the mic
    expect(pp).toContain("camera=()");          // unused features locked off
    expect(pp).toContain("fullscreen=()");      // anti-phishing
    expect(pp).not.toContain("interest-cohort"); // obsolete (FLoC), removed
    expect(r.headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
    expect(r.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
  });

  it("enforces a CSP mirroring the meta policy + header-only hardening", () => {
    const r = withSecurityHeaders(new Response("x"));
    expect(r.headers.get("Content-Security-Policy-Report-Only")).toBeNull(); // enforcing, not report-only
    const csp = r.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");   // header-only (ignored in <meta>)
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("'wasm-unsafe-eval'");        // transformers.js (whisper)
    expect(csp).toContain("worker-src 'self' blob:");   // transformers.js worker
    expect(csp).toContain("https://api.anthropic.com"); // BYOK grader connect target
    // must NOT be more permissive than the meta policy (no open https: / blob: img-src)
    expect(csp).toContain("img-src 'self' data: https://avatars.githubusercontent.com");
    expect(csp).not.toContain("img-src 'self' data: blob: https:");
  });
});
