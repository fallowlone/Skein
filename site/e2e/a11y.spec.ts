import { test, expect, type Page } from "@playwright/test";

// M2: the lesson page must degrade gracefully and stay keyboard-navigable.
// The skip link + landmarks ship in the Topic layout; the radix-based Sheet
// owns the focus trap. This spec pins the observable behavior, not the
// implementation.

// Serial: both tests share one dev server, and a cold content layer makes
// parallel first-loads fight each other (plus the server itself). domcontentloaded
// instead of load: neither test needs fonts/images, only DOM + hydration.
test.describe.configure({ mode: "serial" });

async function gotoReady(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
}

test("skip link is first in tab order and jumps to main content @smoke", async ({ page }) => {
  test.setTimeout(180_000);
  await gotoReady(page, "/en/");
  await page.keyboard.press("Tab");
  const skip = page.locator("a.oa-skip");
  await expect(skip).toBeFocused();
  // Revealed on focus (translated off-screen otherwise) — poll because
  // the reveal is a CSS transition, not an instant flip.
  await expect
    .poll(async () => (await skip.boundingBox())?.y, { timeout: 5_000 })
    .toBeGreaterThanOrEqual(0);
  await page.keyboard.press("Enter");
  expect(page.url()).toContain("#main");
  await expect(page.locator("main#main")).toBeVisible();
});

test("path config sheet traps Tab inside and returns focus on Escape", async ({ page }) => {
  // Cold dev server compiles the 1MB+ PathView graph on first visit; budget
  // generously rather than flake.
  test.setTimeout(600_000);
  await gotoReady(page, "/en/roadmap");
  // PathView is a client:only island — wait for it to hydrate, then open
  // the collapsed "Advanced" details: the trigger lives inside and is absent
  // from the accessibility tree until expanded. Poll with re-clicks because
  // island re-renders (async signal state loading after hydration) can reset
  // the native details toggle underneath us.
  // PathView is client:only with a heavy graph import — it can take minutes
  // on a cold dev server. #plan-skeleton is removed on mount, so its
  // disappearance proves hydration finished (nothing else removes it).
  await expect(page.locator("#plan-skeleton")).toBeHidden({ timeout: 150_000 });
  // Cold start (fresh profile, no stored plan) nests every planning section
  // inside a collapsed outer details ("Set a goal, deadline, or fine-tune").
  // Expand it first, then the AdvancedKnobs details inside it.
  const outer = page.locator("details.cold-more > summary");
  await expect(outer).toBeVisible({ timeout: 30_000 });
  await outer.scrollIntoViewIfNeeded();
  await outer.click();
  // NB: the page has more than one details.inset — scope by summary text.
  const summary = page.locator("details.inset summary", { hasText: /tune how the plan/i });
  await summary.scrollIntoViewIfNeeded();
  await expect(summary).toBeVisible({ timeout: 30_000 });
  const trigger = page.getByRole("button", { name: /advanced graph edits/i });
  await expect
    .poll(
      async () => {
        if ((await trigger.count()) === 0) await summary.click();
        return trigger.count();
      },
      { timeout: 60_000 },
    )
    .toBeGreaterThan(0);
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Every Tab stop stays inside the dialog (radix focus trap).
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    const inside = await dialog.evaluate((d) => d.contains(document.activeElement));
    expect(inside).toBe(true);
  }

  // Escape closes and focus returns to the trigger that opened it.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
