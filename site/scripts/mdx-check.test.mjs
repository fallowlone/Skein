// Consolidation pin: mdx-check.mjs is the single MDX compile-check entry.
// `track <slug> [filter]` = old mdx-check.mjs, `sd [filter]` = old
// mdx-check-sd.mjs (same 4 roots, same output/exit contract), bare
// `<slug> [filter]` still works as the legacy form.
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveRoots, checkRoots } from "./mdx-check.mjs";

describe("resolveRoots", () => {
  it("track subcommand resolves the EN+RU roots for that slug", () => {
    expect(resolveRoots(["track", "networking"])).toEqual({
      roots: [
        "src/content/lessons/en/networking",
        "src/content/lessons/ru/networking",
      ],
      filter: undefined,
    });
  });

  it("track subcommand carries the optional path filter", () => {
    expect(resolveRoots(["track", "networking", "01-x"]).filter).toBe("01-x");
  });

  it("sd subcommand resolves the four system-design roots", () => {
    expect(resolveRoots(["sd"])).toEqual({
      roots: [
        "src/content/lessons/en/system-design",
        "src/content/lessons/ru/system-design",
        "src/content/lessons/en/system-design-cases",
        "src/content/lessons/ru/system-design-cases",
      ],
      filter: undefined,
    });
  });

  it("sd subcommand carries the optional path filter", () => {
    expect(resolveRoots(["sd", "02-raft"]).filter).toBe("02-raft");
  });

  it("legacy bare slug still resolves like track", () => {
    expect(resolveRoots(["networking"])).toEqual(resolveRoots(["track", "networking"]));
  });

  it("missing track is a usage error, not a silent no-op", () => {
    expect(() => resolveRoots([])).toThrowError(/usage/);
    expect(() => resolveRoots(["track"])).toThrowError(/usage/);
  });
});

describe("checkRoots", () => {
  it("compiles fixtures: one good ok, one broken bad", async () => {
    const base = mkdtempSync(join(tmpdir(), "mdx-check-"));
    mkdirSync(join(base, "good"), { recursive: true });
    mkdirSync(join(base, "bad"), { recursive: true });
    writeFileSync(join(base, "good", "index.mdx"), "# Hello\n\nSome *text*.\n");
    writeFileSync(join(base, "bad", "index.mdx"), "# Broken\n\n<Unclosed foo=\"bar\">\n");
    const { ok, bad } = await checkRoots([base], undefined, { quiet: true });
    expect(ok).toBe(1);
    expect(bad).toBe(1);
  });
});
