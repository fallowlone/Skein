import { describe, it, expect } from "vitest";
import { linksForLesson, pickTitle } from "./algo-links";

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

describe("pickTitle", () => {
  it("falls back to EN when the RU title is missing", () => {
    expect(pickTitle({ en: "Sorting" }, "ru", "fallback")).toBe("Sorting");
  });

  it("falls back to the id when both titles are missing", () => {
    expect(pickTitle(undefined, "ru", "u-sort")).toBe("u-sort");
  });
});
