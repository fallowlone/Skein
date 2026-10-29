import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

// M2: the skip link + main landmark ship in the Topic layout (all pages).
// Pin the wired facts from source so a redesign cannot silently drop them.
// Interactive behavior (focus order, focus trap) is covered by e2e/a11y.spec.ts.
describe("Topic layout a11y chrome", () => {
  test("skip link targets the main landmark", () => {
    const layout = readFileSync(resolve("src/layouts/Topic.astro"), "utf8");
    expect(layout).toContain('<a href="#main" class="oa-skip"');
    expect(layout).toContain('<main id="main"');
  });

  test("skip link reveals on keyboard focus", () => {
    const css = readFileSync(resolve("src/styles/atlas-kit.css"), "utf8");
    expect(css).toContain(".oa-skip:focus-visible");
  });

  test("skip label exists in both locales", () => {
    const ui = JSON.parse(readFileSync(resolve("src/i18n/ui.json"), "utf8"));
    const langs = Object.keys(ui);
    expect(langs.length).toBeGreaterThanOrEqual(2);
    for (const lang of langs) {
      expect(ui[lang]["a11y.skipToContent"]).toMatch(/.+/);
    }
  });
});
