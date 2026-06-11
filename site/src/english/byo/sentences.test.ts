import { describe, it, expect } from "vitest";
import { suggestChunkSentences } from "./sentences";

describe("suggestChunkSentences", () => {
  it("maps each lemma to the first sentence containing it", () => {
    const text = "The cache was cold. It turns out that the resolver retried forever! We fixed it.";
    const out = suggestChunkSentences(text, ["resolver", "cache"]);
    expect(out).toEqual([
      { lemma: "resolver", sentence: "It turns out that the resolver retried forever!" },
      { lemma: "cache", sentence: "The cache was cold." },
    ]);
  });
  it("skips lemmas with no sentence and over-long sentences", () => {
    expect(suggestChunkSentences("Short. " + "x".repeat(300) + " hello.", ["hello"])).toEqual([]);
  });
});
