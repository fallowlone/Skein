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
});
