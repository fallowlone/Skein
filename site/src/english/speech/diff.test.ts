// src/english/speech/diff.test.ts
import { describe, it, expect } from "vitest";
import { normalizeWords, scoreShadow } from "./diff";

describe("normalizeWords", () => {
  it("lowercases, strips punctuation, splits on whitespace", () => {
    expect(normalizeWords("The DOM, and CSSOM!")).toEqual(["the", "dom", "and", "cssom"]);
  });
});

describe("scoreShadow", () => {
  it("perfect match scores 1 and marks every word ok", () => {
    const r = scoreShadow("preload the scanner", "Preload the scanner.");
    expect(r.score).toBe(1);
    expect(r.tokens.map((t) => t.status)).toEqual(["ok", "ok", "ok"]);
  });

  it("missing word marks it and lowers the score", () => {
    const r = scoreShadow("the quick brown fox", "the brown fox");
    expect(r.tokens.find((t) => t.target === "quick")?.status).toBe("missing");
    expect(r.score).toBeCloseTo(0.75, 5);
  });

  it("substituted word is flagged as sub", () => {
    const r = scoreShadow("commit the change", "commit the chance");
    expect(r.tokens.find((t) => t.target === "change")?.status).toBe("sub");
    expect(r.score).toBeCloseTo(2 / 3, 5);
  });
});
