import { test, expect } from "@playwright/test";
import { gotoReady } from "./helpers";

// The old version navigated to `/en/networking/` — a pillar route from the retired
// pieces model, which now 404s. Tracks live under `/en/learn/<track>/`, and the
// locale switch lives in the nav rail's EN/RU segment.
test("the locale switch swaps language and keeps the path @smoke", async ({ page }) => {
  test.setTimeout(180_000);
  await gotoReady(page, "/en/learn/networking/");
  // Track pages use poster chrome: the rail collapses to zero by design
  // (poster-kit.css "Dock chrome") and the visible switch is the marquee's
  // .nd-lang segment — same swapLocale hrefs as the rail's .rail-lang.
  await page.locator(".nd-lang a", { hasText: "RU" }).first().click();
  await expect(page).toHaveURL(/\/ru\/learn\/networking\//);

  // And back, so the switch is not one-way.
  await page.locator(".nd-lang a", { hasText: "EN" }).first().click();
  await expect(page).toHaveURL(/\/en\/learn\/networking\//);
});

// Lessons are not static MDX pages under `astro dev` anymore: the corpus renders
// through the lesson Worker (`bun run dev:lessons-worker`), which the default dev
// server does not run. The main site's lesson route only serves the eleven
// `js-engine` lessons hardcoded in its getStaticPaths, so a networking lesson
// 404s there and the nav rail — with the locale switch — never renders.
// Use a preview lesson: a real page with the real rail.
const DEEP_LESSON = "/en/learn/js-engine/01-how-js-runs/02-lazy-parsing";

test("a deep lesson URL keeps its whole path across the switch @smoke", async ({ page }) => {
  test.setTimeout(180_000);
  await gotoReady(page, DEEP_LESSON);
  await page.locator(".rail-lang a", { hasText: "RU" }).first().click();
  await expect(page).toHaveURL(/\/ru\/learn\/js-engine\/01-how-js-runs\/02-lazy-parsing\/?$/);
});
