import { describe, test, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
describe("static page deploy scaffold", () => {
  test("re-exports", async () => {
    const m = await import("../src/page.ts");
    expect(m).toBeDefined();
  });
});
// also import the grader checks directly so scaffold fails
import "../src/page.ts";
