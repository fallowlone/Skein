import { test, expect } from "@playwright/test";

// The old test clicked three buttons on the HOME page and asserted
// `localStorage.awesome.user-state.v1.tier === "senior"`. None of that exists any
// more: placement lives on /profile, it is a two-stage adaptive run, and the result
// is a rating + rank rather than a coarse tier. It failed against a working feature.
test("placement runs from the profile screen and records a rating and rank", async ({ page }) => {
  await page.goto("/en/profile/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Placement is offered before any rating exists.
  const begin = page.getByRole("button", { name: /^Begin$/ });
  await expect(begin).toBeVisible();
  await begin.click();

  // Answer whatever is on screen until the run finishes. The question count is
  // adaptive, and a gate sits between the stages ("Advanced round" / "Skip"), so the
  // loop drives both question screens and that gate rather than a fixed count.
  for (let i = 0; i < 40; i++) {
    const choices = page.locator("aside ul button");
    if ((await choices.count()) > 0) {
      await choices.last().click(); // last option carries the highest weight
      await page.waitForTimeout(150);
      continue;
    }
    const advance = page.getByRole("button", { name: /Advanced round/i });
    if (await advance.isVisible().catch(() => false)) {
      await advance.click();
      await page.waitForTimeout(150);
      continue;
    }
    break;
  }

  const state = await page.evaluate(() => {
    const raw = localStorage.getItem("awesome.user-state.v1");
    return raw ? JSON.parse(raw) : null;
  });

  expect(state).not.toBeNull();
  expect(state.pretest).toBeTruthy();
  expect(typeof state.pretest.rating).toBe("number");
  expect(state.pretest.rating).toBeGreaterThan(0);
  expect(typeof state.pretest.rank).toBe("string");
  expect(state.pretest.rank.length).toBeGreaterThan(0);
  // Stage 1 answers are always recorded; stage 2 only when it was unlocked.
  expect(Array.isArray(state.pretest.stage1.answers)).toBe(true);
});
