import { test, expect } from "@playwright/test";

// This used to assert "16 pillar cards" against a `ul li[class*='border-dashed']`
// selector — both from the retired pillars/pieces model. The home page has been a
// track atlas for a long time, so the test failed on a page that was working fine.
test("home redirects to /en/ and renders the track atlas", async ({ page }) => {
  await page.goto("/");
  expect(page.url()).toContain("/en/");

  const cards = page.locator("a.track-card");
  // Pinning an exact count would break on every new track; assert the shape.
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(20);

  // Tracks are grouped into difficulty bands (foundations → advanced).
  await expect(page.locator("section.oa-band").first()).toBeVisible();

  // Every card links into the learn route and names its track.
  const first = cards.first();
  await expect(first).toHaveAttribute("href", /^\/en\/learn\/[a-z0-9-]+\/$/);
  await expect(first.locator("h2")).not.toBeEmpty();
});
