// Pin test for the D1 migration chain + the observability logstore table.
// The logger (lib/logger.ts) samples per request and lib/logstore.ts persists
// survivors into app_logs with a 30-day opportunistic purge — but no migration
// created that table, so production flushes failed silently. 0011 closes it.
//
// Reads migration files from disk, so it needs Node runtime imports while the
// deployed Functions typecheck intentionally has no Node/Bun runtime types in
// its dependency tree.
// @ts-nocheck
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const files = () => readdirSync(DIR).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
const read = (f: string) => readFileSync(join(DIR, f), "utf8");

describe("migration chain", () => {
  it("is numbered 0001..N with no gaps", () => {
    const nums = files().map((f) => Number(f.slice(0, 4)));
    expect(nums[0]).toBe(1);
    nums.forEach((n, i) => expect(n).toBe(i + 1));
  });

  it("every CREATE uses IF NOT EXISTS (ALTER-only migrations exempt)", () => {
    for (const f of files()) {
      const sql = read(f);
      const creates = sql.match(/CREATE\s+(TABLE|INDEX)/g) ?? [];
      if (creates.length === 0) continue; // e.g. 0004 ALTER-only migration
      const safe = sql.match(/CREATE\s+(TABLE|INDEX)\s+IF NOT EXISTS/g) ?? [];
      expect(safe.length, `${f}: all CREATEs use IF NOT EXISTS`).toBe(creates.length);
    }
  });
});

describe("0011 app_logs (observability logstore)", () => {
  const F = "0011_app_logs.sql";

  it("exists", () => {
    expect(files()).toContain(F);
  });

  it("creates app_logs with every column flushLogs inserts", () => {
    const sql = read(F);
    const table = sql.match(/CREATE TABLE IF NOT EXISTS app_logs \(([\s\S]*?)\);/);
    expect(table, "CREATE TABLE app_logs block").not.toBeNull();
    for (const col of ["ts", "level", "route", "rid", "flow", "user_id", "tag", "msg", "ctx_json"]) {
      expect(table![1], `column ${col}`).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it("indexes the purge predicate so retention cleanup does not full-scan", () => {
    const sql = read(F);
    expect(sql).toMatch(/CREATE INDEX IF NOT EXISTS \w+ ON app_logs\s*\(\s*ts\s*\)/);
  });
});
