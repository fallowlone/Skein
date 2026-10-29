import type { Page } from "@playwright/test";

// Cold dev server: first loads compile the content layer / heavy islands,
// so the default `load` + 30s goto never survives first paint. Neither smoke
// spec needs fonts/images — DOM + hydration is enough, budgeted generously.
// (Same lesson as a11y.spec.ts's local gotoReady, shared for the smoke set.)
export async function gotoReady(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
}
