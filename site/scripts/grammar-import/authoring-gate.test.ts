import { describe, it, expect } from "vitest";
import { grammarTopics } from "~/english/data/grammar/index";
import { authoringErrors } from "~/english/grammar-types";

describe("grammar corpus is fully authored", () => {
  it("no topic has authoring gaps (en prose, family, archetype)", () => {
    const gaps = grammarTopics
      .map((t) => ({ id: t.id, errs: authoringErrors(t) }))
      .filter((r) => r.errs.length > 0);
    expect(gaps).toEqual([]);
  });
});
