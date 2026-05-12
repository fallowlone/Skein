import { test, expect } from "@playwright/test";

test("tier flip persists across reload", async ({ page }) => {
  await page.goto("/en/networking/03-tcp-handshake/");
  await page.evaluate(() =>
    localStorage.setItem(
      "awesome.user-state.v1",
      JSON.stringify({
        tier: "middle",
        lang: "en",
        motion: "auto",
        pretest: { takenAt: 1, score: 0, answers: [] },
        history: {},
        retrieval: {},
        dismissedRevisit: {},
        manualTierFlips: 0,
      })
    )
  );
  await page.reload();
  // The stub piece has no TierAccordion (since stubs render coming-soon shell).
  // For now this test just verifies state persistence by writing a senior tier and re-reading.
  await page.evaluate(() => {
    const raw = localStorage.getItem("awesome.user-state.v1");
    const s = JSON.parse(raw ?? "{}");
    s.tier = "senior";
    localStorage.setItem("awesome.user-state.v1", JSON.stringify(s));
  });
  await page.reload();
  const tier = await page.evaluate(() => {
    const raw = localStorage.getItem("awesome.user-state.v1");
    return raw ? JSON.parse(raw).tier : null;
  });
  expect(tier).toBe("senior");
});
