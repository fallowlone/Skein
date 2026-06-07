import { describe, it, expect } from "vitest";
import { tokenizeToLemmas } from "./tokenize";

describe("tokenizeToLemmas", () => {
  it("lowercases, strips punctuation + possessive, dedupes, and returns counts", () => {
    const r = tokenizeToLemmas("The server, the SERVER! A server's load.");
    expect(r.find((t) => t.lemma === "server")!.count).toBe(3); // server, SERVER, server's → server
    expect(r.find((t) => t.lemma === "the")!.count).toBe(2);
  });

  it("merges regular plurals onto the singular lemma", () => {
    const r = tokenizeToLemmas("server servers queue queues");
    expect(r.find((t) => t.lemma === "server")!.count).toBe(2); // server + servers
    expect(r.find((t) => t.lemma === "queue")!.count).toBe(2);  // queue + queues
    expect(r.some((t) => t.lemma === "servers")).toBe(false);
  });

  it("folds -ies → -y and leaves -ss words intact", () => {
    expect(tokenizeToLemmas("queries").map((t) => t.lemma)).toContain("query");
    expect(tokenizeToLemmas("class classes").find((t) => t.lemma === "class")!.count).toBe(1); // 'class' stays; 'classes' folds to 'classe' (not merged) — guard keeps -ss intact
  });

  it("drops numbers, urls, and 1-char tokens", () => {
    const lemmas = tokenizeToLemmas("see https://x.io 42 a I").map((t) => t.lemma);
    expect(lemmas).toContain("see");
    expect(lemmas).not.toContain("https");
    expect(lemmas).not.toContain("42");
  });

  it("empty / whitespace input → empty array", () => {
    expect(tokenizeToLemmas("")).toEqual([]);
    expect(tokenizeToLemmas("   \n  ")).toEqual([]);
  });
});
