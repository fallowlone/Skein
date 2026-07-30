import { test, expect, type Page } from "@playwright/test";

// The model answer must stay locked until the learner writes their own. Before
// this gate existed, "Reveal model answer" was one click and also marked the task
// done, so predict/design tasks — 39% of all practice — produced no signal at all.
const LESSON = "/en/learn/networking/01-physical-link/01-bits-on-the-wire/";
const PREDICT_TASK = '[data-practice-task="recall-bandwidth-vs-latency"]';

/**
 * The practice section is a `client:visible` island, and Astro server-renders its
 * markup — so the cards are visible (and clickable) before any handler exists.
 * Clicking then does nothing. Astro drops the `ssr` attribute and adds
 * `client-render-time` once hydration completes; wait for that instead.
 */
async function openPracticeTask(page: Page, selector: string) {
  await page.locator("[data-practice-layer]").scrollIntoViewIfNeeded();
  const island = page.locator('astro-island[component-url*="PracticeSection"]');
  await expect(island).toHaveAttribute("client-render-time", /.+/);
  const card = page.locator(selector);
  await expect(card).toBeVisible();
  await card.locator("button").first().click();
  return card;
}

test.describe("practice commit gate", () => {
  test("the model answer is locked until an answer is committed, then a self-grade completes the task", async ({ page }) => {
    await page.goto(LESSON);
    const card = await openPracticeTask(page, PREDICT_TASK);

    const compare = card.getByRole("button", { name: /Compare with the model answer/i });
    const answer = card.locator("textarea");

    await expect(answer).toBeVisible();
    await expect(compare).toBeDisabled();
    await expect(card.getByText(/Write a sentence to unlock/i)).toBeVisible();

    // A stub too short to be an answer keeps the gate shut.
    await answer.fill("no");
    await expect(compare).toBeDisabled();

    await answer.fill("No change — bandwidth is throughput, the first byte still pays propagation delay.");
    await expect(compare).toBeEnabled();

    await compare.click();
    await expect(card.getByText(/Model answer/i)).toBeVisible();
    // Reaching the answer is not completion; the self-grade is.
    const gotIt = card.getByRole("button", { name: /^Got it$/ });
    await expect(gotIt).toBeVisible();

    await gotIt.click();
    await expect(card.getByText(/Marked done/i)).toBeVisible();
  });

  test("an honest skip reveals the answer and is recorded as not known", async ({ page }) => {
    await page.goto(LESSON);
    const card = await openPracticeTask(page, PREDICT_TASK);

    await card.getByRole("button", { name: /I don't know — show it/i }).click();

    await expect(card.getByText(/Model answer/i)).toBeVisible();
    await expect(card.getByText(/Recorded as not known/i)).toBeVisible();
    // No self-grade buttons: skipping already stated the outcome.
    await expect(card.getByRole("button", { name: /^Got it$/ })).toHaveCount(0);
  });

  test("a committed answer survives a reload", async ({ page }) => {
    await page.goto(LESSON);
    const card = await openPracticeTask(page, PREDICT_TASK);
    await card.locator("textarea").fill("Bandwidth widens the hose; it does not shorten it.");

    await page.reload();
    const reopened = await openPracticeTask(page, PREDICT_TASK);
    await expect(reopened.locator("textarea")).toHaveValue(/Bandwidth widens the hose/);
  });
});
