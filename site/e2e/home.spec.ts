import { test, expect } from "@playwright/test";

test("home redirects to /en/ and renders 16 pillar cards", async ({ page }) => {
  await page.goto("/");
  expect(page.url()).toContain("/en/");
  const cards = page.locator("ul li[class*='border-dashed']");
  await expect(cards).toHaveCount(16);
});
