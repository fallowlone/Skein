// functions/lib/logstore.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushLogs } from "./logstore";
import { FakeD1 } from "../test/fakes";
import type { LogEntry } from "./logger";

beforeEach(() => {
  for (const m of ["debug", "info", "warn", "error", "log"] as const) {
    vi.spyOn(console, m).mockImplementation(() => {});
  }
});
afterEach(() => vi.restoreAllMocks());

function entry(over: Partial<LogEntry> = {}): LogEntry {
  return {
    ts: 1700000000000, level: "error", route: "/api/auth/callback",
    rid: "r1", user: 7, tag: "auth.callback.state", msg: "state mismatch", ctx: {},
    ...over,
  };
}

describe("logstore", () => {
  it("persists entries to app_logs with all columns", async () => {
    const db = new FakeD1();
    await flushLogs({ DB: db as unknown as D1Database }, [entry()]);
    expect(db.logs).toHaveLength(1);
    expect(db.logs[0]).toMatchObject({
      level: "error", route: "/api/auth/callback", rid: "r1",
      user_id: 7, tag: "auth.callback.state", msg: "state mismatch",
    });
    expect(typeof db.logs[0].ts).toBe("number");
    expect(typeof db.logs[0].ctx_json).toBe("string");
  });

  it("persists errors even on sampled-out routes", async () => {
    const db = new FakeD1();
    await flushLogs({ DB: db as unknown as D1Database }, [entry({ route: "/en/" })]);
    expect(db.logs).toHaveLength(1);
  });

  it("drops debug entries and skips D1 entirely when nothing survives", async () => {
    const db = new FakeD1();
    await flushLogs({ DB: db as unknown as D1Database }, [entry({ level: "debug" })]);
    expect(db.logs).toHaveLength(0);
    expect(db.statements).not.toContainEqual(expect.stringContaining("INSERT INTO app_logs"));
  });

  it("resolves silently with no DB binding", async () => {
    await expect(flushLogs({}, [entry()])).resolves.toBeUndefined();
  });

  it("resolves silently when D1 throws", async () => {
    const db = { prepare: () => { throw new Error("d1 down"); } };
    await expect(flushLogs({ DB: db as unknown as D1Database }, [entry()])).resolves.toBeUndefined();
  });

  it("purges rows older than 30 days when forced", async () => {
    const db = new FakeD1();
    const now = Date.now();
    db.logs.push({ ts: now - 31 * 86400 * 1000, level: "info", route: "/x", rid: "old", flow: null, user_id: null, tag: "t", msg: "m", ctx_json: "{}" });
    await flushLogs({ DB: db as unknown as D1Database }, [entry({ ts: now })], { purge: true });
    expect(db.logs.some((r) => r.rid === "old")).toBe(false);
    expect(db.logs.some((r) => r.rid === "r1")).toBe(true);
  });
});