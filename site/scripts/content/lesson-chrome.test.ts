import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "../..");
const src = (p: string) => readFile(join(siteRoot, p), "utf8");

describe("lesson chrome contracts", () => {
  it("keeps both marquee halves pixel-identical for a seamless infinite loop", async () => {
    const marquee = await src("src/components/atlas/NavMarquee.astro");
    // The lane loops with translateX(-50%): only two identical halves loop
    // without a jump. The review due-badge must exist in BOTH copies.
    const mirrors = marquee.match(/<span class="nd-due" data-due-mirror/g) ?? [];
    expect(mirrors.length).toBe(2);
    // …and the sync script must update every copy, not just the first.
    expect(marquee).toContain('querySelectorAll("[data-due-mirror]")');
  });

  it("caps every interactive practice widget at the lesson reading measure", async () => {
    const lesson = await src("src/layouts/Lesson.astro");
    const markers = [
      "[data-tradeoff]",
      "[data-trace-scenario]",
      "[data-rfc-quiz]",
      "[data-number-drill]",
      "[data-faded-example]",
      "[data-pretest]",
      "[data-misconception]",
    ];
    for (const marker of markers) {
      const at = lesson.indexOf(`:global(${marker})`);
      expect(at, `${marker} capped`).toBeGreaterThan(-1);
      const block = lesson.slice(at, lesson.indexOf("}", at));
      expect(block, `${marker} max-width`).toContain("max-width: var(--lesson-reading");
    }
  });

  it("keeps a width-contract marker on every interactive widget root", async () => {
    const roots: Array<[string, string]> = [
      ["src/components/pedagogy/TradeoffMatrix.astro", "data-tradeoff"],
      ["src/components/pedagogy/TraceScenario.astro", "data-trace-scenario"],
      ["src/components/pedagogy/RFCQuiz.astro", "data-rfc-quiz"],
      ["src/components/pedagogy/NumberDrill.astro", "data-number-drill"],
      ["src/components/pedagogy/FadedExample.tsx", "data-faded-example"],
      ["src/components/pedagogy/Pretest.tsx", "data-pretest"],
      ["src/components/layout/Misconception.astro", "data-misconception"],
    ];
    for (const [file, marker] of roots) {
      expect(await src(file), `${file} root marker`).toContain(marker);
    }
  });
});
