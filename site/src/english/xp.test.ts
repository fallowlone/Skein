// site/src/english/xp.test.ts
import { describe, it, expect } from "vitest";
import { englishXp, ENGLISH_XP_PER_KNOWN } from "./xp";

describe("englishXp", () => {
  it("is zero with no known words", () => {
    expect(englishXp(0)).toBe(0);
  });
  it("scales with known words", () => {
    expect(englishXp(10)).toBe(10 * ENGLISH_XP_PER_KNOWN);
  });
});
