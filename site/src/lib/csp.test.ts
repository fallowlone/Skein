import { describe, it, expect } from "vitest";
import { buildCsp } from "./csp";

describe("buildCsp", () => {
  it("produces the strict baseline", () => {
    const csp = buildCsp();
    expect(csp).toContain("connect-src 'self' https://api.anthropic.com");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  });
  it("adds wasm + worker directives when extra=wasm, without touching connect-src", () => {
    const csp = buildCsp("wasm");
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("connect-src 'self' https://api.anthropic.com"); // unchanged
  });
});
