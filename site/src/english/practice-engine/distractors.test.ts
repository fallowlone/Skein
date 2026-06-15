import { describe, it, expect } from "vitest";
import { makeDistractors, toMultipleChoice } from "./distractors";
import { createRng } from "./rng";

describe("makeDistractors", () => {
  it("returns plausible wrong verb forms, never equal to the answer", () => {
    const ds = makeDistractors("works", { lemma: "work", kind: "verb" }, 3);
    expect(ds.length).toBe(3);
    expect(ds).not.toContain("works");
    expect(new Set(ds).size).toBe(3);
  });
});

describe("toMultipleChoice", () => {
  it("builds 4 options containing the answer at the recorded index", () => {
    const mc = toMultipleChoice("works", ["work", "working", "worked"], createRng(3));
    expect(mc.options.length).toBe(4);
    expect(mc.options).toContain("works");
    expect(mc.options[mc.correctIndex]).toBe("works");
  });
});
