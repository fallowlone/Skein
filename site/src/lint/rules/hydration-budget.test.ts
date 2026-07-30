import { describe, expect, test } from "vitest";
import { checkHydrationBudget } from "./hydration-budget";

const islands = (n: number) => "<astro-island uid='x'></astro-island>".repeat(n);
const lesson = "/repo/site/dist/en/learn/networking/01-physical-link/01-bits-on-the-wire/index.html";
const lessonRu = "/repo/site/dist/ru/learn/math/04-powers/01-exponents/index.html";

describe("checkHydrationBudget", () => {
  test("matches the live lesson route (the retired pieces path matched nothing)", () => {
    expect(checkHydrationBudget(islands(20), lesson)).toHaveLength(1);
    expect(checkHydrationBudget(islands(20), lessonRu)).toHaveLength(1);
  });

  test("passes a lesson within budget", () => {
    expect(checkHydrationBudget(islands(8), lesson)).toEqual([]);
  });

  test("fails a lesson over budget and names the count", () => {
    const [msg] = checkHydrationBudget(islands(9), lesson);
    expect(msg).toContain("9 hydration islands");
  });

  test("exempts hub and nav pages", () => {
    for (const f of [
      "/repo/site/dist/en/index.html",
      "/repo/site/dist/en/projects/index.html",
      "/repo/site/dist/en/glossary/index.html",
      "/repo/site/dist/en/learn/networking/index.html",
      "/repo/site/dist/en/learn/networking/01-physical-link/index.html",
    ]) {
      expect(checkHydrationBudget(islands(40), f)).toEqual([]);
    }
  });

  test("ignores paths outside dist", () => {
    expect(checkHydrationBudget(islands(40), "/repo/site/src/pages/x.astro")).toEqual([]);
  });
});
