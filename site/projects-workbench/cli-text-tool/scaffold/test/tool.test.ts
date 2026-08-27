import { describe, test, expect } from "bun:test";
import { spawnSync } from "node:child_process";

describe("cli text tool", () => {
  test("filters lines", () => {
    const r = spawnSync("bun", ["src/tool.ts", "--filter", "foo"], { input: "foo bar\nbaz\nfoo\n" });
    expect(r.stdout.toString()).toContain("foo");
  });
  test("counts lines", () => {
    const r = spawnSync("bun", ["src/tool.ts", "--count"], { input: "a\nb\nc\n" });
    expect(r.stdout.toString().trim()).toBe("3");
  });
  test("slices lines", () => {
    const r = spawnSync("bun", ["src/tool.ts", "--slice", "1:2"], { input: "a\nb\nc\nd\n" });
    expect(r.stdout.toString()).toContain("a");
  });
  test("bad flag exits non-zero", () => {
    const r = spawnSync("bun", ["src/tool.ts", "--bad-flag"], { input: "" });
    expect(r.status).not.toBe(0);
  });
});
