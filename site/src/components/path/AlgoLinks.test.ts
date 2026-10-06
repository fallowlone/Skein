import { describe, it, expect } from "vitest";
import { linksForLesson, linksForUnit, pickTitle } from "./algo-links";
import { applyCurated } from "../../../scripts/path/algo-links-core.mjs";

const index = {
  units: {
    "algorithms/u-sort": [
      { lesson: "backend/db/keys", shared: 0, canonical: true },
      { lesson: "backend/db/indexes", shared: 3, canonical: false },
    ],
  },
  lessons: {
    "backend/db/keys": [{ unit: "algorithms/u-sort", shared: 0, canonical: true }],
    "backend/db/indexes": [{ unit: "algorithms/u-sort", shared: 3, canonical: false }],
  },
};

describe("linksForLesson", () => {
  it("returns pinned always entries first", () => {
    const links = linksForLesson(index, "backend/db/indexes", "en");
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toMatchObject({ unit: "algorithms/u-sort", canonical: false });
  });

  it("returns [] for an unknown lesson", () => {
    expect(linksForLesson(index, "nope/nope/nope", "en")).toEqual([]);
  });

  it("resolves unit titles with hrefs into the algorithms track", () => {
    const links = linksForLesson(index, "backend/db/keys", "en");
    expect(links[0].href).toMatch(/^\/en\/learn\/algorithms\//);
    expect(typeof links[0].title).toBe("string");
  });
});

describe("linksForUnit", () => {
  const big = {
    units: {
      "algorithms/u-big": Array.from({ length: 13 }, (_, i) => ({
        lesson: `t1/u1/l${String(i + 1).padStart(2, "0")}`,
        shared: 13 - i,
        canonical: false,
      })),
    },
    lessons: {},
  };

  it("caps rows at 12", () => {
    const links = linksForUnit(big, "algorithms/u-big", "en");
    expect(links).toHaveLength(12);
    expect(links[0].lesson).toBe("t1/u1/l01");
    expect(links[0].track).toBe("t1");
  });

  it("omits never-suppressed lessons end to end via the core", () => {
    const derived = {
      "algorithms/u-s": [
        { lesson: "t1/u1/keep", shared: 3, concepts: ["c1"] },
        { lesson: "t1/u1/drop", shared: 2, concepts: ["c1"] },
      ],
    };
    const { index: curated } = applyCurated(derived, [
      { algo: "algorithms/u-s", lesson: "t1/u1/drop", kind: "never" },
    ]);
    const links = linksForUnit({ units: curated, lessons: {} }, "algorithms/u-s", "ru");
    expect(links.map((l) => l.lesson)).toEqual(["t1/u1/keep"]);
  });

  it("returns [] for an unknown unit", () => {
    expect(linksForUnit(big, "algorithms/u-nope", "en")).toEqual([]);
  });
});

describe("pickTitle", () => {
  it("falls back to EN when the RU title is missing", () => {
    expect(pickTitle({ en: "Sorting" }, "ru", "fallback")).toBe("Sorting");
  });

  it("falls back to the id when both titles are missing", () => {
    expect(pickTitle(undefined, "ru", "u-sort")).toBe("u-sort");
  });
});
