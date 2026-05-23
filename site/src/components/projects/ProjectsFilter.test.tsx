import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import ProjectsFilter, { filterProjects } from "./ProjectsFilter";
import type { ProjectData } from "~/content.config";

const p = (slug: string, tracks: string[], difficulty: ProjectData["difficulty"]): ProjectData => ({
  slug, tracks, difficulty, estDays: 3, skills: ["x"],
  title: { en: slug, ru: slug }, pitch: { en: "p", ru: "п" },
  deliverable: { en: "d", ru: "д" },
  milestones: [{ en: "m1", ru: "м1" }, { en: "m2", ru: "м2" }],
  seniorStretch: [{ en: "s", ru: "с" }],
} as ProjectData);

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
