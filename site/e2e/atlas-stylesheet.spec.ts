import { test, expect } from "@playwright/test";

// Atlas inlines the critical CSS (tokens + atlas-kit) and loads the rest of global.css
// off the critical path. global.css is also where `@tailwind utilities` lives, so if the
// async swap silently fails, atlas-kit pages still look fine while every Tailwind class
// on the page does nothing — which is exactly how the projects detail page ended up
// rendering as raw semantic HTML. Assert the sheet actually applies.
test("Atlas pages apply global.css, so Tailwind utilities take effect", async ({ page }) => {
  await page.goto("/en/projects/lru-cache");

  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.styleSheets].some((s) => (s.href ?? "").includes("global")),
      ),
    )
    .toBe(true);

  // Probe a utility rather than a specific element: this stays true however the page
  // is restyled, and false whenever the utility layer is missing.
  const probe = await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "text-sm p-2";
    document.body.appendChild(el);
    const cs = getComputedStyle(el);
    const out = { fontSize: cs.fontSize, padding: cs.padding };
    el.remove();
    return out;
  });
  expect(probe.fontSize).toBe("14px");
  expect(probe.padding).toBe("8px");
});
