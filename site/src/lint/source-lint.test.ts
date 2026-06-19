import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { runSourceLint } from "./index";

// runSourceLint is the shared source-only lint used by both the pre-build fast
// check (scripts/lint-src.mjs) and the post-build runLint. It reads src/ directly.
describe("runSourceLint", () => {
  it("returns the {errors,warnings} shape and is clean on committed source", async () => {
    const siteSrc = resolve(process.cwd(), "src") + "/"; // vitest runs from site/
    const res = await runSourceLint(siteSrc);
    expect(Array.isArray(res.warnings)).toBe(true);
    expect(res.errors).toEqual([]);
  }, 120_000);
});
