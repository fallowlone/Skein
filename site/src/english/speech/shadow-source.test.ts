import { describe, it, expect } from "vitest";
import { pickShadowSentences } from "./shadow-source";
import type { VocabEntry } from "~/english/types";

const entries: VocabEntry[] = [
  { id: "a", lemma: "deploy", rank: 1, band: "A2", pos: "verb", ru: "развернуть", gloss: "release code", examples: ["We deploy on Fridays."] },
  { id: "b", lemma: "latency", rank: 2, band: "B2", pos: "noun", ru: "задержка", gloss: "delay", examples: ["Latency spiked at noon.", "Tail latency matters."] },
  { id: "c", lemma: "noexample", rank: 3, band: "A2", pos: "noun", ru: "x", gloss: "x", examples: [] },
];

describe("pickShadowSentences", () => {
  it("returns example sentences up to band, skipping entries with none", () => {
    const out = pickShadowSentences(entries, "B1", 10);
    expect(out).toContain("We deploy on Fridays.");
    expect(out).not.toContain("Latency spiked at noon."); // B2 > B1
    expect(out.every((s) => s.length > 0)).toBe(true);
  });
  it("respects the limit", () => {
    expect(pickShadowSentences(entries, "B2", 1).length).toBe(1);
  });
});
