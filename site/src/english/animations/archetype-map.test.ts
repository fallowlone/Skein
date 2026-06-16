import { describe, it, expect } from "vitest";
import { resolveAnimation, ARCHETYPE_BUILDERS, ALIASES } from "./archetype-map";
import type { GrammarTopic } from "~/english/grammar-types";

const topic = (archetype: string, params?: GrammarTopic["archetypeParams"]): GrammarTopic =>
  ({ id: "t", archetype, archetypeParams: params, title: { en: "X", ru: "X" }, family: "tenses", cefr: "A2", levels: [], lessons: {}, related: [], crossTopic: [], egp: [] } as unknown as GrammarTopic);

describe("archetype-map", () => {
  it("resolves a core archetype to its builder + a valid scene", () => {
    const r = resolveAnimation(topic("timeline", { labels: ["a", "b"] }), "en");
    expect(r).not.toBeNull();
    expect(r!.archetype).toBe("timeline");
    expect(r!.scene().prims.length).toBeGreaterThan(0);
  });

  it("resolves each alias to its canonical builder", () => {
    expect(resolveAnimation(topic("comparison", { labels: ["a", "b"] }), "en")!.archetype).toBe("contrast-pair");
    expect(resolveAnimation(topic("fill-gap", { labels: ["a"] }), "en")!.archetype).toBe("slot-fill");
    expect(resolveAnimation(topic("cycle", { labels: ["a", "b"] }), "en")!.archetype).toBe("transformation");
    expect(resolveAnimation(topic("tree", { labels: ["a"] }), "en")!.archetype).toBe("scale");
  });

  it("defaults missing params to an empty labels array (never throws)", () => {
    const r = resolveAnimation(topic("timeline"), "en");
    expect(r!.scene().prims.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown archetype", () => {
    expect(resolveAnimation(topic("does-not-exist", { labels: ["a"] }), "en")).toBeNull();
  });

  it("every alias target exists in the builder registry", () => {
    for (const target of Object.values(ALIASES)) expect(ARCHETYPE_BUILDERS[target]).toBeDefined();
  });
});
