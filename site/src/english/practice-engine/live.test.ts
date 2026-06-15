import { describe, it, expect } from "vitest";
import { proposeLiveExercises } from "./live";
import type { GrammarTopic } from "~/english/grammar-types";

const topic = { id: "present-simple", title: { en: "Present simple", ru: "—" }, cefr: "A1" } as unknown as GrammarTopic;

describe("proposeLiveExercises", () => {
  it("returns only items that pass the structural validator", async () => {
    const proposer = async () => [
      { type: "fill_in_blank" as const, prompt: "She ___ home.", answer: "goes", rationale: { en: "x", ru: "y" } },
      { type: "fill_in_blank" as const, prompt: "no blank here", answer: "goes", rationale: { en: "x", ru: "y" } }, // invalid
    ];
    const out = await proposeLiveExercises(topic, proposer, 2);
    expect(out.length).toBe(1);
    expect(out[0].prompt).toContain("___");
    expect(out[0].topicId).toBe("present-simple");
  });

  it("never throws when the proposer rejects — returns []", async () => {
    const proposer = async () => { throw new Error("network"); };
    const out = await proposeLiveExercises(topic, proposer, 3);
    expect(out).toEqual([]);
  });
});
