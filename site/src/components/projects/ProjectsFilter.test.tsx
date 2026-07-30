import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import ProjectsFilter, { filterProjects, type ProjectCard } from "./ProjectsFilter";

// The island takes a locale-resolved projection, not the raw content entry —
// see ProjectCard in ProjectsFilter.tsx for why.
const p = (slug: string, tracks: string[], difficulty: string): ProjectCard => ({
  slug, tracks, difficulty, estDays: 3,
  title: slug, pitch: "p", category: "backend",
});

const all = [p("a", ["databases"], "starter"), p("b", ["backend"], "advanced"), p("c", ["databases", "backend"], "intermediate")];

describe("filterProjects", () => {
  test("returns all when no filter", () => { expect(filterProjects(all, "all", "all").length).toBe(3); });
  test("filters by track", () => { expect(filterProjects(all, "databases", "all").map((x) => x.slug)).toEqual(["a", "c"]); });
  test("filters by difficulty", () => { expect(filterProjects(all, "all", "advanced").map((x) => x.slug)).toEqual(["b"]); });
  test("filters by both", () => { expect(filterProjects(all, "backend", "intermediate").map((x) => x.slug)).toEqual(["c"]); });
});

describe("ProjectsFilter render", () => {
  test("renders every project title", () => {
    const html = render(<ProjectsFilter lang="en" projects={all} />);
    expect(html).toContain(">a<");
    expect(html).toContain(">b<");
  });
});
