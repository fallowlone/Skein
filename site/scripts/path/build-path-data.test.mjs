import { test, expect } from "vitest";
import { estMinFor } from "./build-path-data.mjs";

// practiceMap keys are unitId strings; value is total practice minutes for that unit.
// When the key is absent → no practice file → fell back to prose estimate.
test("missing practice falls back and flags", () => {
  expect(estMinFor("networking/01-intro", {}, 12)).toEqual({ min: 12, fellBack: true });
  expect(estMinFor("networking/01-intro", { "networking/01-intro": 9 }, 12)).toEqual({ min: 9 + 12, fellBack: false });
});

test("zero practice minutes (dir exists but empty) does NOT count as fell back", () => {
  // A unit with an empty practice dir (total = 0) can be ambiguous.
  // The map value 0 means the dir existed but contributed no minutes → not a fallback.
  // The absent key means no practice dir at all → fallback.
  expect(estMinFor("networking/02-osi", { "networking/02-osi": 0 }, 8)).toEqual({ min: 0 + 8, fellBack: false });
});

test("min is Math.max(5, round(proseMin + practiceMin))", () => {
  // Small prose + no practice → clamped to 5
  expect(estMinFor("math/01-counting", {}, 1)).toEqual({ min: 5, fellBack: true });
  // Normal case
  expect(estMinFor("math/01-counting", { "math/01-counting": 10 }, 6)).toEqual({ min: 16, fellBack: false });
});
