import { readFileSync } from "node:fs";
import { test, expect } from "vitest";
import {
  MIN_SHARED,
  CAP_PER_ALGO,
  computeDerived,
  applyCurated,
  buildIndex,
} from "./algo-links-core.mjs";
import { loadCorpus, assertCuratedRefs, INDEX_RELPATH, TITLES_RELPATH } from "./build-algo-links.mjs";

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

test("tie on shared count prefers the cross-track lesson (scarce, goal-relevant)", () => {
  const { derived } = computeDerived({
    unitConcepts: { "algorithms/u-x": { teaches: ["c1", "c2"] } },
    lessonConcepts: {
      "algorithms/u-x/l-in": ["c1", "c2"],
      "t1/u1/l-out": ["c1", "c2"],
    },
    lessonOrder: ["algorithms/u-x/l-in", "t1/u1/l-out"],
  });
  expect(derived["algorithms/u-x"].map((e) => e.lesson)).toEqual([
    "t1/u1/l-out", // cross-track wins the tie even when ordered last
    "algorithms/u-x/l-in",
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

test("buildIndex emits deterministically sorted keys even with curated-only units", () => {
  const { index } = buildIndex({
    unitConcepts,
    lessonConcepts,
    lessonOrder,
    curated: [{ algo: "algorithms/u-zzz", lesson: "backend/db/keys", kind: "always" }],
  });
  expect(Object.keys(index.units)).toEqual([...Object.keys(index.units)].sort());
  expect(Object.keys(index.lessons)).toEqual([...Object.keys(index.lessons)].sort());
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

// vitest serves modules under a /@fs prefix, so import.meta.url cannot be
// used for filesystem paths here; the suite always runs with cwd = site/.
test("assertCuratedRefs fails fast on dangling refs so the builder never writes them", () => {
  const units = { "algorithms/u-a": { teaches: ["c1"] } };
  const lessons = { "t1/u1/l1": ["c1"] };
  expect(() =>
    assertCuratedRefs({
      curated: [{ algo: "algorithms/u-a", lesson: "t1/u1/l1", kind: "always" }],
      unitConcepts: units,
      lessonConcepts: lessons,
    }),
  ).not.toThrow();
  expect(() =>
    assertCuratedRefs({
      curated: [{ algo: "algorithms/u-nope", lesson: "t1/u1/l1", kind: "never" }],
      unitConcepts: units,
      lessonConcepts: lessons,
    }),
  ).toThrow(/unknown algo unit/);
  expect(() =>
    assertCuratedRefs({
      curated: [{ algo: "algorithms/u-a", lesson: "t1/u1/nope", kind: "never" }],
      unitConcepts: units,
      lessonConcepts: lessons,
    }),
  ).toThrow(/unknown lesson/);
  expect(() =>
    assertCuratedRefs({
      curated: [{ algo: "algorithms/u-a", lesson: "t1/u1/l1", kind: "sometimes" }],
      unitConcepts: units,
      lessonConcepts: lessons,
    }),
  ).toThrow(/kind/);
});

const SITE_ROOT = `${process.cwd()}/`;

test("corpus: derived keys are well-formed, capped, and match the committed index", () => {
  const corpus = loadCorpus(SITE_ROOT);
  const { index } = buildIndex(corpus);
  for (const hits of Object.values(index.units)) {
    expect(hits.length).toBeLessThanOrEqual(12);
    for (const h of hits) {
      expect(h.lesson).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/);
    }
  }
  // Goal pin: the spec promises links between the algorithms track and ALL
  // lessons — the lessons map must contain non-algorithms keys.
  expect(Object.keys(index.lessons).some((k) => !k.startsWith("algorithms/"))).toBe(true);
  // Stale index fails here: changing concepts or curated data requires
  // re-running `bun run build:algo-links` and committing the result.
  const committed = JSON.parse(readFileSync(SITE_ROOT + INDEX_RELPATH, "utf8"));
  const { _note, ...rest } = committed;
  expect(_note).toMatch(/do not hand-edit/);
  expect(index).toEqual(rest);
  // Titles file covers every linked node (units + lessons), so UI blocks
  // never need the 2.7MB lesson-index.json.
  const titles = JSON.parse(readFileSync(SITE_ROOT + TITLES_RELPATH, "utf8"));
  for (const unit of Object.keys(index.units)) {
    expect(titles.units[unit]?.slug).toMatch(/^[a-z0-9-]+$/);
  }
  for (const key of Object.keys(index.lessons)) {
    expect(titles.lessons[key]?.en ?? titles.lessons[key]?.ru).toBeTruthy();
  }
  // Rename-proof: the committed titles file equals a fresh load (minus _note),
  // so a retitled lesson can't go stale silently.
  const { _note: _t, ...freshTitles } = {
    _note: "",
    lessons: Object.fromEntries(
      Object.keys(index.lessons).map((k) => [k, corpus.titles.lessons[k] ?? {}]),
    ),
    units: corpus.titles.units,
    tracks: corpus.titles.tracks,
  };
  const { _note: _c, ...committedTitles } = titles;
  expect(committedTitles).toEqual(freshTitles);

  // Pilot databases×algorithms (P1-P3): exact derived rows.
  const u03 = index.units["algorithms/03-sorting-search"];
  expect(u03.length).toBe(9);
  expect(u03).toContainEqual({
    lesson: "databases/03-execution-plans/03-join-algorithms",
    shared: 3,
    canonical: false,
  });
  expect(u03).toContainEqual({
    lesson: "databases/02-indexes/01-index-anatomy",
    shared: 2,
    canonical: false,
  });
  const u01 = index.units["algorithms/01-thinking-complexity"];
  expect(u01.length).toBe(8);
  expect(u01).toContainEqual({
    lesson: "databases/02-indexes/01-index-anatomy",
    shared: 2,
    canonical: false,
  });
  // Hashing pin converted to derived: the join lesson teaches hash tables,
  // hash functions, and buckets, so 05-hashing links with shared 2+ and no
  // canonical row remains anywhere in unit 05.
  expect(index.lessons["databases/03-execution-plans/03-join-algorithms"]).toEqual([
    {
      unit: "algorithms/03-sorting-search",
      shared: 3,
      canonical: false,
    },
    {
      unit: "algorithms/05-hashing",
      shared: 3,
      canonical: false,
    },
  ]);
  const u05 = index.units["algorithms/05-hashing"];
  expect(u05.length).toBe(7);
  expect(u05).toContainEqual({
    lesson: "databases/03-execution-plans/03-join-algorithms",
    shared: 3,
    canonical: false,
  });
  expect(u05.some((h) => h.canonical)).toBe(false);
  // No other databases lesson leaks into the index.
  expect(
    Object.keys(index.lessons).filter((k) => k.startsWith("databases/")).sort(),
  ).toEqual([
    "databases/02-indexes/01-index-anatomy",
    "databases/03-execution-plans/03-join-algorithms",
    "databases/06-migrations/03-lock-queue-incident",
  ]);
  // P4: FIFO lock queue is derived; unit 06 stays capped at 12 by evicting
  // its weakest in-track row (own quiz-short, shared 2) per cross-track-first.
  const u06 = index.units["algorithms/06-lists-stacks-queues"];
  expect(u06.length).toBe(12);
  expect(u06).toContainEqual({
    lesson: "databases/06-migrations/03-lock-queue-incident",
    shared: 2,
    canonical: false,
  });
  expect(
    u06.some((h) => h.lesson === "algorithms/06-lists-stacks-queues/quiz-short"),
  ).toBe(false);
  // Bonus derived row: level-order traversal runs on a FIFO queue.
  const u07 = index.units["algorithms/07-trees"];
  expect(u07.length).toBe(10);
  expect(u07).toContainEqual({
    lesson: "databases/06-migrations/03-lock-queue-incident",
    shared: 2,
    canonical: false,
  });
  expect(index.lessons["databases/06-migrations/03-lock-queue-incident"]).toContainEqual({
    unit: "algorithms/06-lists-stacks-queues",
    shared: 2,
    canonical: false,
  });
});
