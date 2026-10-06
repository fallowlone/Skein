import { test, expect } from "vitest";
import {
  MIN_SHARED,
  CAP_PER_ALGO,
  computeDerived,
  applyCurated,
  buildIndex,
} from "./algo-links-core.mjs";

// 2 algo units; 4 lessons sharing 3 / 1 / 0 / 2 concepts with u-sort.
const unitConcepts = {
  "algorithms/u-sort": { teaches: ["sorting", "complexity", "arrays"] },
  "algorithms/u-hash": { teaches: ["hashing"] },
};
const lessonConcepts = {
  "backend/db/indexes": ["sorting", "complexity", "arrays", "btree"],
  "backend/db/keys": ["sorting"],
  "backend/api/paging": [],
  "backend/api/caching": ["sorting", "complexity"],
};
const lessonOrder = [
  "backend/db/indexes",
  "backend/db/keys",
  "backend/api/paging",
  "backend/api/caching",
];

test("MIN_SHARED excludes lessons sharing fewer than 2 concepts", () => {
  const { derived } = computeDerived({ unitConcepts, lessonConcepts, lessonOrder });
  const lessons = derived["algorithms/u-sort"].map((e) => e.lesson);
  expect(lessons).toContain("backend/db/indexes"); // 3 shared
  expect(lessons).toContain("backend/api/caching"); // 2 shared
  expect(lessons).not.toContain("backend/db/keys"); // 1 shared
  expect(lessons).not.toContain("backend/api/paging"); // 0 shared
  expect(MIN_SHARED).toBe(2);
});

test("ranking is by shared count desc, then lesson order", () => {
  const { derived } = computeDerived({ unitConcepts, lessonConcepts, lessonOrder });
  expect(derived["algorithms/u-sort"].map((e) => e.lesson)).toEqual([
    "backend/db/indexes", // 3 shared
    "backend/api/caching", // 2 shared
  ]);
});

test("tie on shared count breaks by lesson order", () => {
  const order = ["backend/api/caching", "backend/db/indexes"];
  const { derived } = computeDerived({ unitConcepts, lessonConcepts, lessonOrder: order });
  expect(derived["algorithms/u-sort"].map((e) => e.lesson)).toEqual([
    "backend/db/indexes", // 3 shared still first
    "backend/api/caching",
  ]);
  const tied = computeDerived({
    unitConcepts: { "algorithms/u-tie": { teaches: ["sorting", "complexity"] } },
    lessonConcepts,
    lessonOrder: order,
  });
  expect(tied.derived["algorithms/u-tie"].map((e) => e.lesson)).toEqual([
    "backend/api/caching", // order[0] wins the 2-vs-2 tie
    "backend/db/indexes",
  ]);
});

test("always pins on top with canonical flag, never suppresses", () => {
  const { derived } = computeDerived({ unitConcepts, lessonConcepts, lessonOrder });
  const { index } = applyCurated(derived, [
    { algo: "algorithms/u-sort", lesson: "backend/db/keys", kind: "always" },
    { algo: "algorithms/u-sort", lesson: "backend/api/caching", kind: "never" },
  ]);
  const lessons = index["algorithms/u-sort"];
  expect(lessons[0]).toMatchObject({ lesson: "backend/db/keys", canonical: true });
  expect(lessons.map((e) => e.lesson)).not.toContain("backend/api/caching");
  expect(lessons.map((e) => e.lesson)).toContain("backend/db/indexes");
});

test("misspelled kind throws naming the entry", () => {
  const { derived } = computeDerived({ unitConcepts, lessonConcepts, lessonOrder });
  expect(() =>
    applyCurated(derived, [
      { algo: "algorithms/u-sort", lesson: "backend/db/keys", kind: "sometimes" },
    ]),
  ).toThrow(/kind/);
});

test("buildIndex returns bidirectional capped index plus coverage", () => {
  const { index, coverage } = buildIndex({
    unitConcepts,
    lessonConcepts,
    lessonOrder,
    knownConceptIds: ["sorting", "complexity", "arrays", "btree", "hashing"],
    curated: [],
  });
  expect(index.units["algorithms/u-sort"].length).toBeLessThanOrEqual(CAP_PER_ALGO);
  // reverse map: lesson -> algo units
  expect(index.lessons["backend/db/indexes"].map((e) => e.unit)).toContain(
    "algorithms/u-sort",
  );
  expect(index.lessons["backend/api/paging"] ?? []).toEqual([]);
  expect(coverage.zeroLink).toContain("algorithms/u-hash");
  expect(coverage.withLinks).toBe(1);
});
