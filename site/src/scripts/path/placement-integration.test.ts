import { describe, it, expect } from "vitest";
import { buildConceptGraph } from "./graph";
import { priorFor, posterior, propagatePriors, collapse, resolveIrt, variance, SETTLE_VAR } from "./bayes";
import type { Concept } from "./types";

const mk = (id: string, requires: string[], band: any = "surface"): Concept =>
  ({ id, label: { en: id, ru: id }, track: "backend" as any, band, requires });

describe("placement funnel (model-level integration)", () => {
  it("repeated correct answers settle a concept as known and lift its prereqs", () => {
    const g = buildConceptGraph([mk("base", [], "foundations"), mk("mid", ["base"]), mk("adv", ["mid"], "advanced")]);
    // `base` starts UNDER-estimated (never-level prior) — demonstrating a known descendant
    // lifts a low prereq prior. raise-only propagation only fires when current < lift.
    let priors = new Map([
      ["base", priorFor("never", "foundations")],
      ["mid", priorFor("never", "surface")],
      ["adv", priorFor("basics", "advanced")],
    ]);
    // advanced/mcq/4 → guess c=0.25, so each correct is weak evidence; three corrects settle it.
    const irt = resolveIrt(undefined, "advanced", "mcq", 4);
    let p = priors.get("adv")!;
    p = posterior(p, "correct", irt);
    p = posterior(p, "correct", irt);
    p = posterior(p, "correct", irt);
    priors.set("adv", p);
    priors = propagatePriors(priors, g, "adv", p, "correct");
    expect(collapse(p).confidence).toBeGreaterThan(0.6);
    expect(priors.get("base")!).toBeGreaterThan(priorFor("never", "foundations"));
  });

  it("dont_know answers settle a concept as not-known with low variance", () => {
    const irt = resolveIrt(undefined, "advanced", "mcq", 4);
    let p = priorFor("prod", "advanced");
    p = posterior(p, "dont_know", irt);
    p = posterior(p, "dont_know", irt);
    expect(collapse(p).confidence).toBeLessThan(0.2);
    expect(variance(p)).toBeLessThan(SETTLE_VAR);
  });
});
