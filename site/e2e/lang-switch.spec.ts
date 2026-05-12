import { test, expect } from "@playwright/test";

test("LangSwitch swaps locale and stays on same path", async ({ page }) => {
  await page.goto("/en/networking/");
  await page.locator("a:has-text('RU')").first().click();
  await expect(page).toHaveURL(/\/ru\/networking\//);
});
