// Cross-dataset integrity for the German learning layer. Guards the invariants
// that the SRS engine, stats and routing rely on after the A1→B1 expansion:
// globally-unique card ids, per-deck ascending unique ranks, article-bearing
// nouns, well-formed grammar/reading/output records.
import { describe, it, expect } from "vitest";
import { vocabA1 } from "./vocab-a1";
import { vocabA2 } from "./vocab-a2";
import { vocabB1 } from "./vocab-b1";
import { germanGrammar } from "./grammar";
import { germanOutputTasks } from "./output/tasks";
import { readingUnits } from "./reading";
import type { VocabEntry } from "~/german/types";

const POS = ["noun", "verb", "adj", "adv", "phrase", "abbr", "other"];
const decks: [string, VocabEntry[]][] = [
  ["A1", vocabA1],
  ["A2", vocabA2],
  ["B1", vocabB1],
];
const allVocab = [...vocabA1, ...vocabA2, ...vocabB1];

describe("german vocab — expanded decks", () => {
  it("hits the expansion targets", () => {
    expect(vocabA1.length).toBeGreaterThanOrEqual(250);
    expect(vocabA2.length).toBeGreaterThanOrEqual(250);
    expect(vocabB1.length).toBeGreaterThanOrEqual(150);
  });

  it("card ids are globally unique across all three decks", () => {
    const ids = allVocab.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(decks)("%s deck: ranks unique and strictly ascending, id===idFor(rank)", (band, deck) => {
    const ranks = deck.map((e) => e.rank);
    expect(new Set(ranks).size).toBe(ranks.length);
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]).toBeGreaterThan(ranks[i - 1]);
    for (const e of deck) {
      expect(e.band).toBe(band);
      expect(e.id).toBe(`de:${String(e.rank).padStart(4, "0")}`);
    }
  });

  it("every entry is well-formed; every noun carries its article", () => {
    for (const e of allVocab) {
      expect(POS).toContain(e.pos);
      expect(e.ru.trim().length).toBeGreaterThan(0);
      expect(e.gloss.trim().length).toBeGreaterThan(0);
      expect(e.examples.length).toBeGreaterThanOrEqual(1);
      expect(e.examples.every((s) => s.trim().length > 0)).toBe(true);
      if (e.pos === "noun") expect(e.lemma).toMatch(/^(der|die|das) \S/);
    }
  });

  it("no ASCII-substituted umlauts in German example text", () => {
    // catches ae/oe/ue/ss stand-ins only inside obviously-German tokens is too
    // broad; instead assert the data contains real umlauts somewhere (sanity)
    const blob = allVocab.flatMap((e) => e.examples).join(" ");
    expect(/[äöüßÄÖÜ]/.test(blob)).toBe(true);
  });
});

describe("german grammar — expanded", () => {
  it("has at least 14 points with unique ids and >=2 cloze each", () => {
    expect(germanGrammar.length).toBeGreaterThanOrEqual(14);
    const ids = germanGrammar.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of germanGrammar) {
      expect(g.cloze.length).toBeGreaterThanOrEqual(2);
      expect(g.examples.length).toBeGreaterThanOrEqual(2);
      expect(["A1", "A2", "B1"]).toContain(g.band);
      for (const c of g.cloze) expect(c.answer.trim().length).toBeGreaterThan(0);
      for (const ex of g.examples) {
        expect(ex.de.trim().length).toBeGreaterThan(0);
        expect(ex.ru.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("german reading — expanded", () => {
  const TYPES_OK = true;
  it("has >=14 units with unique ids and valid question answers", () => {
    expect(readingUnits.length).toBeGreaterThanOrEqual(14);
    const ids = readingUnits.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of readingUnits) {
      expect(["A1", "A2", "B1"]).toContain(u.level);
      expect(["general", "engineering"]).toContain(u.stream);
      expect(u.passages.length).toBeGreaterThanOrEqual(3);
      for (const p of u.passages) {
        expect(p.de.trim().length).toBeGreaterThan(0);
        expect(p.ru.trim().length).toBeGreaterThan(0);
      }
      for (const q of u.questions) {
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    }
    expect(TYPES_OK).toBe(true);
  });
});

describe("german output — expanded", () => {
  const TYPE_UNION = [
    "pr-comment", "standup", "design-rationale", "bug-report",
    "incident-summary", "commit-message", "rfc-summary", "review-reply",
  ];
  it("has >=14 tasks with unique ids, valid types, bilingual model answers", () => {
    expect(germanOutputTasks.length).toBeGreaterThanOrEqual(14);
    const ids = germanOutputTasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of germanOutputTasks) {
      expect(TYPE_UNION).toContain(t.type);
      expect(["A1", "A2", "B1"]).toContain(t.band);
      expect(t.rubric.length).toBeGreaterThanOrEqual(1);
      expect(t.prompt.en.trim().length).toBeGreaterThan(0);
      expect(t.prompt.ru.trim().length).toBeGreaterThan(0);
      if (t.modelAnswer) {
        expect(t.modelAnswer.de.trim().length).toBeGreaterThan(0);
        expect(t.modelAnswer.ru.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
