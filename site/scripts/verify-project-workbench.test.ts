import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";

describe("verify:projects runner", () => {
  it("self-test passes (classifies passing-scaffold, never-fixed, fixed)", () => {
    const r = spawnSync("bun", ["scripts/run-project-workbench.mjs", "--self-test"], { cwd: ".", encoding: "utf8" });
    expect(r.stdout).toContain("self-test OK");
    expect(r.status).toBe(0);
  });
});
