import { describe, it, expect } from "vitest";
import {
  projectFeedsFrom,
  buildLessonProjectIndex,
  projectsForTrack,
  type ProjectLite,
} from "./project-index";

describe("projectFeedsFrom", () => {
  it("flattens and de-dupes feedsFrom across milestones", () => {
    const p = {
      slug: "x",
      tracks: ["apis"],
      milestones: [
        { feedsFrom: ["apis/07-rate-limiting/01-overview", "caching/01-layers/01-overview"] },
        { feedsFrom: ["apis/07-rate-limiting/01-overview"] }, // dup
        { goal: { en: "no feeds" } }, // legacy BiText milestone, no feedsFrom
      ],
    };
    expect(projectFeedsFrom(p)).toEqual([
      "apis/07-rate-limiting/01-overview",
      "caching/01-layers/01-overview",
    ]);
  });
});

const PROJECTS: ProjectLite[] = [
  {
    slug: "rate-limiter",
    tracks: ["apis", "backend"],
    feedsFrom: ["apis/07-rate-limiting/01-overview", "caching/01-layers/01-overview"],
  },
  {
    slug: "write-ahead-log",
    tracks: ["databases"],
    feedsFrom: ["apis/07-rate-limiting/01-overview", "databases/03-wal/01-overview"],
  },
  {
    slug: "no-feeds",
    tracks: ["security"],
    feedsFrom: [],
  },
];

describe("buildLessonProjectIndex", () => {
  it("maps a lesson key to every project feeding from it, in list order", () => {
    const idx = buildLessonProjectIndex(PROJECTS);
    expect(idx.get("apis/07-rate-limiting/01-overview")).toEqual([
      "rate-limiter",
      "write-ahead-log",
    ]);
    expect(idx.get("databases/03-wal/01-overview")).toEqual(["write-ahead-log"]);
    expect(idx.get("nope/00/00")).toBeUndefined();
  });
});

describe("projectsForTrack", () => {
  it("matches via tracks array", () => {
    expect(projectsForTrack(PROJECTS, "security")).toEqual(["no-feeds"]);
  });
  it("matches via feedsFrom prefix even when not in tracks array", () => {
    // caching is referenced only through rate-limiter's feedsFrom
    expect(projectsForTrack(PROJECTS, "caching")).toEqual(["rate-limiter"]);
  });
  it("de-dupes a project that matches on both axes", () => {
    expect(projectsForTrack(PROJECTS, "apis")).toEqual(["rate-limiter", "write-ahead-log"]);
  });
  it("returns empty for an unrelated track", () => {
    expect(projectsForTrack(PROJECTS, "frontend")).toEqual([]);
  });
});
