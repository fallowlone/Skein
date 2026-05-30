// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { vocabB2 } from "./vocab-b2";
import { vocabA2 } from "./vocab-a2";
import { vocabB1 } from "./vocab-b1";

const POS = ["noun", "verb", "adj", "adv", "phrase", "abbr", "other"];

function csvLemmaByRank(name: string): Map<number, string> {
  const path = fileURLToPath(new URL(`./${name}`, import.meta.url));
  const text = readFileSync(path, "utf8").trim();
  const m = new Map<number, string>();
  for (const line of text.split(/\r?\n/).slice(1)) {
    const [rank, lemma] = line.split(",");
    m.set(Number(rank), lemma);
  }
  return m;
}

describe("vocab-b2 dataset", () => {
  it("has the full B2 band enriched", () => {
    expect(vocabB2.length).toBeGreaterThanOrEqual(1700);
  });

  it("every entry is well-formed and in band B2", () => {
    for (const e of vocabB2) {
      expect(e.band).toBe("B2");
      expect(e.id).toMatch(/^(ngsl|nawl):\d{4}$/);
      expect(e.lemma.trim().length).toBeGreaterThan(0);
      expect(Number.isFinite(e.rank)).toBe(true);
      expect(POS).toContain(e.pos);
      expect(e.ru.trim().length).toBeGreaterThan(0);
      expect(e.gloss.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(e.examples) && e.examples.length >= 1).toBe(true);
    }
  });

  it("ids are unique and disjoint from A2 + B1", () => {
    const ids = vocabB2.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const lower = new Set([...vocabA2, ...vocabB1].map((e) => e.id));
    expect(vocabB2.every((e) => !lower.has(e.id))).toBe(true);
  });

  it("lemma + rank match the source CSV truth", () => {
    const ngsl = csvLemmaByRank("ngsl.csv");
    const nawl = csvLemmaByRank("nawl.csv");
    for (const e of vocabB2) {
      const [src, rankStr] = e.id.split(":");
      expect(e.rank).toBe(Number(rankStr));
      const expected = src === "ngsl" ? ngsl.get(e.rank) : nawl.get(e.rank);
      expect(e.lemma).toBe(expected);
      if (src === "ngsl") expect(e.rank).toBeGreaterThanOrEqual(2001);
    }
  });
});
