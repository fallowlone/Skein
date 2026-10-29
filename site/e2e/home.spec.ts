import { test, expect } from "@playwright/test";
import { gotoReady } from "./helpers";

// This used to assert "16 pillar cards" against a `ul li[class*='border-dashed']`
// selector — both from the retired pillars/pieces model. The home page has been a
// track atlas for a long time, so the test failed on a page that was working fine.
// Since then the atlas was reskinned to the poster design: rows are `a.poster-row`
// inside `section.poster-band` (see `pages/[lang]/index.astro`), not `a.track-card`
// / `section.oa-band`. Same repair as before: assert the shipped shape.
test("home redirects to /en/ and renders the track atlas @smoke", async ({ page }) => {
  test.setTimeout(180_000);
  await gotoReady(page, "/");
  expect(page.url()).toContain("/en/");

  const cards = page.locator("a.poster-row");
  // Pinning an exact count would break on every new track; assert the shape.
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(20);

  // Tracks are grouped into difficulty bands (foundations → advanced).
  await expect(page.locator("section.poster-band").first()).toBeVisible();

  // Every card links into the learn route and names its track.
  const first = cards.first();
  await expect(first).toHaveAttribute("href", /^\/en\/learn\/[a-z0-9-]+\/$/);
  await expect(first.locator(".pr-name")).not.toBeEmpty();
});
