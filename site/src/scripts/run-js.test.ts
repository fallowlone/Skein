import { describe, expect, test } from "vitest";
import { runJs } from "./run-js";

describe("runJs resource limits", () => {
  test("caps learner stdout instead of growing host memory without bound", async () => {
    const result = await runJs("for (let i = 0; i < 1000; i++) console.log('x'.repeat(100)); 'done';", undefined, 2_500);
    expect(result.error).toBeUndefined();
    expect(result.value).toBe("done");
    expect(result.stdout).toContain("[output truncated]");
    expect(result.stdout.length).toBeLessThan(66_000);
  });
});
