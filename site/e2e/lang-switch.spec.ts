import { test, expect } from "@playwright/test";

// The old version navigated to `/en/networking/` — a pillar route from the retired
// pieces model, which now 404s. Tracks live under `/en/learn/<track>/`, and the
// locale switch lives in the nav rail's EN/RU segment.
test("the locale switch swaps language and keeps the path", async ({ page }) => {
  await page.goto("/en/learn/networking/");
  await page.locator(".rail-lang a", { hasText: "RU" }).first().click();
  await expect(page).toHaveURL(/\/ru\/learn\/networking\//);

  // And back, so the switch is not one-way.
  await page.locator(".rail-lang a", { hasText: "EN" }).first().click();
  await expect(page).toHaveURL(/\/en\/learn\/networking\//);
});

test("a deep lesson URL keeps its whole path across the switch", async ({ page }) => {
  await page.goto("/en/learn/networking/01-physical-link/01-bits-on-the-wire/");
  await page.locator(".rail-lang a", { hasText: "RU" }).first().click();
  await expect(page).toHaveURL(/\/ru\/learn\/networking\/01-physical-link\/01-bits-on-the-wire\//);
});
