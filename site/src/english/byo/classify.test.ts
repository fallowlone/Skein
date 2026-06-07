import { describe, it, expect } from "vitest";
import { classifyLemmas, type BankIndexEntry } from "./classify";

const BANK: BankIndexEntry[] = [
  { id: "ngsl:1", lemma: "server" },
  { id: "ngsl:2", lemma: "queue" },
  { id: "nawl:1", lemma: "idempotent" },
];

describe("classifyLemmas", () => {
  it("splits known / new / technical against the bank + known set", () => {
    const known = new Set(["ngsl:1"]); // server known
    const r = classifyLemmas(
      [{ lemma: "server", count: 2 }, { lemma: "queue", count: 1 }, { lemma: "backpressure", count: 3 }],
      BANK, (id) => known.has(id),
    );
    expect(r.known.map((x) => x.lemma)).toEqual(["server"]);
    expect(r.newWords.map((x) => x.id)).toEqual(["ngsl:2"]);          // queue: in bank, not known
    expect(r.technical.map((x) => x.lemma)).toEqual(["backpressure"]); // not in bank
    expect(r.counts).toEqual({ known: 1, new: 1, technical: 1 });
  });

  it("a bank word that is unknown but NAWL-technical counts as new (it has a card path)", () => {
    const r = classifyLemmas([{ lemma: "idempotent", count: 1 }], BANK, () => false);
    expect(r.newWords.map((x) => x.id)).toEqual(["nawl:1"]);
    expect(r.technical).toEqual([]);
  });

  it("empty input → empty buckets, zero counts", () => {
    const r = classifyLemmas([], BANK, () => false);
    expect(r).toMatchObject({ known: [], newWords: [], technical: [], counts: { known: 0, new: 0, technical: 0 } });
  });
});
