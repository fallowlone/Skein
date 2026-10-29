// CI e2e split pin (M3): a fast @smoke subset blocks deploy on push,
// the full suite runs nightly on schedule. Dev path (`bun run e2e`) is
// untouched — tags only select the CI subset.
// Lives in scripts/ because vitest include covers scripts/**/*.test.mjs.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = dirname(dirname(fileURLToPath(import.meta.url)));
const workflow = readFileSync(join(SITE, "..", ".github", "workflows", "deploy.yml"), "utf8");
const pkg = JSON.parse(readFileSync(join(SITE, "package.json"), "utf8"));
const e2eDir = join(SITE, "e2e");
const smokeIn = (f) =>
  (readFileSync(join(e2eDir, f), "utf8").match(/test\("([^"]*@smoke[^"]*)"/g) ?? []).length;

describe("e2e CI split", () => {
  it("e2e:smoke script selects the tagged subset", () => {
    expect(pkg.scripts["e2e:smoke"]).toMatch(/playwright test.*--grep.*@smoke/);
  });

  it("smoke job runs the subset on push and blocks deploy", () => {
    expect(workflow).toMatch(/e2e-smoke:[\s\S]*?playwright test --grep @smoke|e2e:smoke/);
    expect(workflow).toMatch(/needs:\s*\[[^\]]*e2e-smoke[^\]]*\]/);
  });

  it("full suite runs nightly on schedule, not per push", () => {
    expect(workflow).toMatch(/if:\s*github\.event_name\s*==\s*'schedule'[\s\S]*?bun run e2e\b(?!:)/);
  });

  it("smoke tags are exactly home + lang-switch + a11y skip link", () => {
    expect(smokeIn("home.spec.ts")).toBe(1);
    expect(smokeIn("lang-switch.spec.ts")).toBe(2);
    expect(smokeIn("a11y.spec.ts")).toBe(1);
    const others = readdirSync(e2eDir)
      .filter((f) => f.endsWith(".spec.ts") && !["home.spec.ts", "lang-switch.spec.ts", "a11y.spec.ts"].includes(f))
      .map((f) => [f, smokeIn(f)])
      .filter(([, n]) => n > 0);
    expect(others).toEqual([]);
  });

  it("the 10-minute sheet walkthrough stays nightly-only", () => {
    expect(readFileSync(join(e2eDir, "a11y.spec.ts"), "utf8")).not.toMatch(/traps Tab inside[^"]*@smoke/);
  });
});
