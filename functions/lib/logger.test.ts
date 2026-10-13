// functions/lib/logger.test.ts
import { describe, it, expect } from "vitest";
import {
  bindLogger,
  levelEnabled,
  shouldPersist,
  redact,
  MAX_CTX_BYTES,
  type LogEntry,
} from "./logger";

describe("logger", () => {
  it("binds a full entry with route, rid, user, tag and msg", () => {
    const buf: LogEntry[] = [];
    const log = bindLogger(buf, { route: "/api/auth/callback", rid: "r1", user: 7 });
    log.log("error", "auth.callback.state", "state mismatch");
    expect(buf).toHaveLength(1);
    expect(buf[0]).toMatchObject({
      level: "error",
      route: "/api/auth/callback",
      rid: "r1",
      user: 7,
      tag: "auth.callback.state",
      msg: "state mismatch",
      ctx: {},
    });
    expect(typeof buf[0].ts).toBe("number");
  });

  it("hoists ctx.flow onto the entry", () => {
    const buf: LogEntry[] = [];
    bindLogger(buf, { route: "/api/auth/callback", rid: "r1" }).log("info", "t", "m", { flow: "f1" });
    expect(buf[0].flow).toBe("f1");
    expect(buf[0].ctx).toEqual({});
  });

  it("setUser updates later entries", () => {
    const buf: LogEntry[] = [];
    const log = bindLogger(buf, { route: "/api/auth/callback", rid: "r1" });
    log.log("info", "t", "before");
    log.setUser(42);
    log.log("info", "t", "after");
    expect(buf[0].user).toBeNull();
    expect(buf[1].user).toBe(42);
  });

  it("redacts tokens, secrets, emails and cookie headers", () => {
    expect(redact("ghu_abc123")).toBe("[redacted]");
    expect(redact("github_pat_xyz")).toBe("[redacted]");
    expect(redact("sk-live-123")).toBe("[redacted]");
    expect(redact("user@example.com")).toBe("[redacted]");
    expect(redact({ headers: { cookie: "session=a" } })).toEqual({ headers: { cookie: "[redacted]" } });
    expect(redact({ SESSION_SECRET: "s", nested: [{ apiToken: "t" }] })).toEqual({
      SESSION_SECRET: "[redacted]",
      nested: [{ apiToken: "[redacted]" }],
    });
    expect(redact("plain text")).toBe("plain text");
  });

  it("redacts ctx on log calls", () => {
    const buf: LogEntry[] = [];
    bindLogger(buf, { route: "/x", rid: "r" }).log("error", "t", "m", { token: "ghu_x", ok: 1 });
    expect(buf[0].ctx).toEqual({ token: "[redacted]", ok: 1 });
  });

  it("levelEnabled defaults to info and tolerates unknown strings", () => {
    expect(levelEnabled("info", undefined)).toBe(true);
    expect(levelEnabled("debug", undefined)).toBe(false);
    expect(levelEnabled("error", undefined)).toBe(true);
    expect(levelEnabled("debug", "debug")).toBe(true);
    expect(levelEnabled("info", "bogus")).toBe(true);
    expect(levelEnabled("debug", "bogus")).toBe(false);
  });

  it("shouldPersist keeps errors always and debug never", () => {
    expect(shouldPersist("error", "/en/")).toBe(true);
    expect(shouldPersist("error", "/api/learn/attempt")).toBe(true);
    expect(shouldPersist("debug", "/api/auth/callback")).toBe(false);
  });

  it("shouldPersist keeps info on allowlisted routes", () => {
    for (const route of ["/api/auth/callback", "/api/admin/x", "/api/payments/y", "/api/telegram/z", "/api/coach/w"]) {
      expect(shouldPersist("info", route)).toBe(true);
    }
  });

  it("truncates oversized ctx with a marker", () => {
    const buf: LogEntry[] = [];
    bindLogger(buf, { route: "/x", rid: "r" }).log("error", "t", "m", { blob: "x".repeat(MAX_CTX_BYTES + 100) });
    const raw = JSON.stringify(buf[0].ctx);
    expect(raw.length).toBeLessThanOrEqual(MAX_CTX_BYTES + 100);
    expect(buf[0].ctx.truncated).toBe(true);
  });
});
