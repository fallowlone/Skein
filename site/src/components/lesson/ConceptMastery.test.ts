import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/lesson/ConceptMastery.astro", "utf8");

describe("ConceptMastery", () => {
  it("renders knowledge status without a click-to-claim-mastery control", () => {
    expect(source).toContain("data-concept-status");
    expect(source).not.toContain("<button");
    expect(source).not.toContain("advanceConceptMastery");
  });
});
