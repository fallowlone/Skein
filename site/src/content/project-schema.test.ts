import { describe, it, expect } from "vitest";
import { z } from "astro/zod";

// Mirror of the project milestones schema in content.config.ts (which can't be
// imported directly in Vitest — it pulls the astro:content virtual module).
const BiText = z.object({ en: z.string().min(1), ru: z.string().min(1) });
const GuidedMilestone = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: BiText,
  goal: BiText,
  definitionOfDone: z.array(BiText).min(1),
  feedsFrom: z.array(z.string()).optional(),
  reviewPrompt: BiText.optional(),
});
const milestones = z.array(z.union([BiText, GuidedMilestone])).min(2);

const guided = {
  id: "m1",
  title: { en: "Token bucket core", ru: "Ядро token bucket" },
  goal: { en: "Implement the core algorithm with refill", ru: "Реализуй ядро алгоритма с пополнением" },
  definitionOfDone: [{ en: "passes a burst test", ru: "проходит burst-тест" }],
};

describe("project milestones schema (guided union)", () => {
  it("accepts guided-object milestones", () => {
    expect(milestones.safeParse([guided, { ...guided, id: "m2" }]).success).toBe(true);
  });
  it("still accepts legacy plain {en,ru} milestones (backward compat)", () => {
    expect(milestones.safeParse([{ en: "Step one", ru: "Шаг один" }, { en: "Step two", ru: "Шаг два" }]).success).toBe(true);
  });
  it("rejects a guided milestone missing ru in its title", () => {
    expect(milestones.safeParse([{ ...guided, title: { en: "x" } }, { ...guided, id: "m2" }]).success).toBe(false);
  });
  it("accepts optional feedsFrom + reviewPrompt", () => {
    const full = { ...guided, feedsFrom: ["apis/01-rest/02-status-codes"], reviewPrompt: { en: "Did you bound it?", ru: "Ты ограничил?" } };
    expect(milestones.safeParse([full, { ...guided, id: "m2" }]).success).toBe(true);
  });
});
