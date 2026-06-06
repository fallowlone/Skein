import { describe, it, expect } from "vitest";
import { buildBundle } from "./build-diag-bundle.mjs";

const BANKS = {
  "b": { concept: "b", items: [{ id: "b1", type: "mcq", prompt: { en: "?", ru: "?" }, choices: [], answer: 0 }] },
  "a": { concept: "a", items: [{ id: "a1", type: "blanks", prompt: { en: "?", ru: "?" }, answer: ["x"] }] },
};

describe("buildBundle", () => {
  it("index is sorted concept ids", () => {
    expect(buildBundle(BANKS).index).toEqual(["a", "b"]);
  });
  it("bundle is keyed by concept in sorted order", () => {
    const { bundle } = buildBundle(BANKS);
    expect(Object.keys(bundle)).toEqual(["a", "b"]);
    expect(bundle.a.items[0].answer).toEqual(["x"]);
  });
});
